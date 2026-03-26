# GitHub Actions Workflows

This directory contains the CI/CD pipelines for ShopNova using GitHub Actions.

## Workflows

### 1. `ci.yml` - Full CI/CD Pipeline
**Triggers:** Push to main/develop, Pull requests to main

**Features:**
- ✅ Frontend tests (Vitest)
- ✅ Backend tests (Jest + Supertest) with real services
- ✅ Security scanning (Trivy)
- ✅ Docker image building and pushing
- ✅ Automated deployment to staging
- ✅ Success notifications

**Services tested:**
- PostgreSQL, MongoDB, Redis, RabbitMQ, Elasticsearch

### 2. `dev.yml` - Development CI
**Triggers:** Push to any branch, Pull requests

**Features:**
- ✅ TypeScript type checking
- ✅ Frontend tests (39 tests)
- ✅ Backend tests (55 tests)
- ✅ Fast feedback for developers

### 3. `deploy.yml` - Manual Deployment
**Triggers:** Manual workflow dispatch

**Features:**
- ✅ Choose environment (staging/production)
- ✅ Specify version or use latest
- ✅ Full test suite before deployment
- ✅ Health checks after deployment
- ✅ Deployment notifications

## Environment Variables

The workflows use these environment variables:

### Required Secrets
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `DOCKER_REGISTRY_URL`: If using private registry
- `KUBECONFIG`: For Kubernetes deployment
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: For AWS deployment
- `GCP_PROJECT_ID` / `GCP_SA_KEY`: For GCP deployment

### Configuration
- `NODE_VERSION`: '20' (Node.js version)
- `REGISTRY`: 'ghcr.io' (GitHub Container Registry)
- `IMAGE_NAME`: ${{ github.repository }}

## Pipeline Status

| Workflow | Status | Description |
|----------|--------|-------------|
| CI/CD Pipeline | ![CI/CD](https://github.com/DanielN02/ShopNova/workflows/CI%2FCD%20Pipeline/badge.svg) | Full pipeline with Docker deployment |
| Development CI | ![Dev CI](https://github.com/DanielN02/ShopNova/workflows/Development%20CI/badge.svg) | Quick checks on every push |
| Deploy to Production | ![Deploy](https://github.com/DanielN02/ShopNova/workflows/Deploy%20to%20Production/badge.svg) | Manual deployment workflow |

## How It Works

### On Push/Pull Request
1. **Development CI** runs immediately for quick feedback
2. **Full CI/CD** runs comprehensive tests if needed
3. **Security scan** checks for vulnerabilities
4. **Docker images** are built and pushed (main branch only)
5. **Deployment** to staging happens automatically (main branch only)

### Manual Deployment
1. Go to Actions tab in GitHub
2. Select "Deploy to Production" workflow
3. Choose environment and version
4. Click "Run workflow"
5. Monitor deployment progress

## Docker Images

Built images are pushed to GitHub Container Registry:
- `ghcr.io/danieln02/shopnova/frontend:latest`
- `ghcr.io/danieln02/shopnova/user-service:latest`
- `ghcr.io/danieln02/shopnova/product-service:latest`
- `ghcr.io/danieln02/shopnova/order-service:latest`
- `ghcr.io/danieln02/shopnova/notification-service:latest`

## Monitoring

- **Test Results**: 94 tests total (39 frontend + 55 backend)
- **Security**: Trivy vulnerability scanning
- **Build Time**: ~5-10 minutes
- **Deployment**: Automated health checks

## Customization

To customize for your deployment target:

1. **Docker**: Update `deploy.yml` with docker-compose commands
2. **Kubernetes**: Add kubectl commands and K8s manifests
3. **Cloud**: Add provider-specific deployment commands
4. **Monitoring**: Add Prometheus/Grafana setup
5. **Notifications**: Add Slack/Discord webhooks

## Troubleshooting

### Common Issues
- **Service timeouts**: Increase health check wait times
- **Memory limits**: Add more RAM to GitHub runners
- **Permission errors**: Check workflow permissions
- **Registry access**: Verify GITHUB_TOKEN permissions

### Debug Commands
```bash
# Check workflow runs
gh run list

# View specific run
gh run view <run-id>

# Download logs
gh run download <run-id>
```

## Next Steps

1. Configure your deployment target
2. Add required secrets to GitHub repository
3. Test workflows on a feature branch
4. Enable for main branch when ready
5. Set up monitoring and alerts
