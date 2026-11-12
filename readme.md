# Backend Service CI/CD Example

## Project

This project provides Azure Functions for managing products.

### Available Endpoints

- `GET /api/products` - List all products
- `POST /api/products` - Upsert (create or update) a product
- `PUT /api/products` - Upsert (create or update) a product

## CI/CD Features

This project includes a GitHub Actions workflow (`.github/workflows/build.yml`) to build the project. This would act as a Continuous Integration (CI) check to verify the latest code changes (git commit) have not broken the code base.

Make a small code change, `git commit`, `git push` and then observe the GitHub Action running in the GitHub website (within the Actions tab of the code repo).

> There may be other branches in this repo demonstrating additional CI/CD features.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local settings file:

Copy the template to create your local development settings:

```bash
cp local.settings.template.json local.settings.json
```

> **Note:** Never commit your `local.settings.json` to source control. The template is safe to share.

3. Build the project:

```bash
npm run build
```

## Local testing with curl

### Start the Function App

```bash
npm start
```

The function app will start on `http://localhost:7071`.

### List Products

Split the VS Code terminal so you can see the output from the localling running app whilst having a new shell prompt to make a test HTTP call:

```bash
curl -i http://localhost:7071/api/products
```

The fake repo initialises with some example data, so expect an array of products.

### Upsert a Product

Using the sample data file (and a new bash terminal):

```bash
curl -i -X POST http://localhost:7071/api/products \
  -H "Content-Type: application/json" \
  -d @samples/product-post.json
```

Repeating the list products call should now show the new item.

## Azure Setup

### Sign into Azure CLI

Prepare for using the az CLI commands.

1. Ensure you are signed in:

```bash
az login
az account show
```

You should see your account properties displayed if you are successfully signed in.

2. Ensure you know which locations (e.g. uksouth) you are permitted to use:

```bash
az policy assignment list \
  --query "[?name.contains(@, 'sys.regionrestriction')].parameters.listOfAllowedLocations.value | []" \
  -o tsv
```

### Create a Resource Group and Azure Function App

1. Create a resource group (if you do not already have one for this deployment):

```bash
az group create \
  --name <your-resource-group> \
  --location <permitted-location>
```

Remember to follow our naming convention, e.g. shopping-lab-ab47-rg

2. Create a storage account (required for Azure Functions):

```bash
az storage account create \
  --name <yourfuncstorageaccount> \
  --location <permitted-location> \
  --resource-group <your-resource-group> \
  --sku Standard_LRS
```

3. Create the Function App:

```bash
az functionapp create \
  --name <your-function-app> \
  --resource-group <your-resource-group> \
  --storage-account <yourfuncstorageaccount> \
  --consumption-plan-location <permitted-location> \
  --runtime node \
  --functions-version 4
```

### Publish the Project to Azure

Build and deploy your code to the Function App:

```bash
npm run build
func azure functionapp publish <your-function-app>
```

You can now access your endpoints at:

```
https://<your-function-app>.azurewebsites.net/api/products
```

### Configure CORS (if app needs to call this)

If needed, allow cross-domain calls from your app domain and/or localhost, for example:

```bash
az functionapp cors add \
  --name <your-function-app> \
  --resource-group <your-resource-group> \
  --allowed-origins http://localhost:5173
```

## Terraform and CI/CD

The `infra/` folder declares the same resources as the manual Azure Setup above (resource group, storage account, consumption plan, Function App, Application Insights). Resource names are generated as `<project>-<environment>-<random suffix>`, e.g. `shopping-lab-x7k2qm-rg`.

The workflow `.github/workflows/build.yml` runs:

| Event | Jobs |
| --- | --- |
| Pull request to `main` | `build` (npm build, `terraform fmt`/`validate`) then `plan` (Terraform plan against Azure) |
| Push to `main` / manual run | `build` then `deploy` (Terraform apply, publish code, smoke test `/api/products`) |

### One-time setup

Terraform state must be stored in Azure so CI runs (and your local runs) share it. GitHub signs in to Azure as a service principal using a client secret, stored as the repository secret `AZURE_CLIENT_SECRET`. The secret expires (1 year below), so rotate it before then (see [Rotating the client secret](#rotating-the-client-secret)).

1. Create the Terraform state storage (pick a globally unique account name):

```bash
LOCATION=uksouth
TFSTATE_RG=shopping-lab-tfstate-rg
TFSTATE_SA=<yourtfstateaccount>

az group create --name $TFSTATE_RG --location $LOCATION
az storage account create --name $TFSTATE_SA --resource-group $TFSTATE_RG \
  --location $LOCATION --sku Standard_LRS \
  --min-tls-version TLS1_2 --allow-blob-public-access false
az storage container-rm create --storage-account $TFSTATE_SA \
  --resource-group $TFSTATE_RG --name tfstate
```

2. Create an identity for GitHub Actions and a client secret for it:

```bash
SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
APP_ID=$(az ad app create --display-name shopping-lab-cicd --query appId -o tsv)
az ad sp create --id $APP_ID

CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --append \
  --display-name github-actions --years 1 --query password -o tsv)
```

> Treat `CLIENT_SECRET` like a password: don't echo it, commit it or paste it anywhere except the GitHub secret below.

3. Grant access: the identity creates resources in the subscription and reads/writes the state blob. You also need blob access to run Terraform locally.

```bash
TFSTATE_ID=$(az storage account show --name $TFSTATE_SA --resource-group $TFSTATE_RG --query id -o tsv)

az role assignment create --assignee $APP_ID --role Contributor --scope /subscriptions/$SUB_ID
az role assignment create --assignee $APP_ID --role "Storage Blob Data Contributor" --scope $TFSTATE_ID
az role assignment create --assignee $(az ad signed-in-user show --query id -o tsv) \
  --role "Storage Blob Data Contributor" --scope $TFSTATE_ID
```

4. Add the GitHub repository secret and variables (Settings > Secrets and variables > Actions; the client secret goes under **Secrets**, the rest under **Variables**), or with the `gh` CLI:

```bash
gh secret set AZURE_CLIENT_SECRET --body "$CLIENT_SECRET"
gh variable set AZURE_CLIENT_ID --body $APP_ID
gh variable set AZURE_TENANT_ID --body $TENANT_ID
gh variable set AZURE_SUBSCRIPTION_ID --body $SUB_ID
gh variable set TFSTATE_RESOURCE_GROUP --body $TFSTATE_RG
gh variable set TFSTATE_STORAGE_ACCOUNT --body $TFSTATE_SA
gh variable set AZURE_LOCATION --body $LOCATION
# Optional: TFSTATE_CONTAINER (default tfstate)
```

### Rotating the client secret

Before the secret expires (or if it leaks), create a new one and update GitHub. `--append` keeps the old one working until you remove it:

```bash
CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --append \
  --display-name github-actions --years 1 --query password -o tsv)
gh secret set AZURE_CLIENT_SECRET --body "$CLIENT_SECRET"

# Then remove the old one (find its keyId in the list):
az ad app credential list --id $APP_ID -o table
az ad app credential delete --id $APP_ID --key-id <old-key-id>
```

> Moving from an earlier OIDC setup? Remove the now-unused federated credentials with `az ad app federated-credential list --id $APP_ID` and `az ad app federated-credential delete --id $APP_ID --federated-credential-id <id>`.

### Running Terraform locally

```bash
cd infra
cp backend.hcl.example backend.hcl   # fill in the same TFSTATE values
terraform init -backend-config=backend.hcl
terraform plan
```

> If you previously applied with local state, run `terraform init -migrate-state -backend-config=backend.hcl` to move it into Azure instead of creating a second set of resources.
