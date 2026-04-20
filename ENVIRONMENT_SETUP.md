# Environment Variables Setup

This project uses environment variables for configuration management and security.

## Files

- `.env.example` - Template with all required environment variables
- `.env.development` - Development environment configuration
- `.env` - Your local environment (gitignored)
- `.env.production` - Production environment (gitignored)
- `.env.test` - Test environment (gitignored)

## Quick Setup

1. Copy the example file:
```bash
cp .env.example .env
```

2. Or use the development template:
```bash
cp .env.development .env
```

3. Update the values in your `.env` file with your actual secrets.

## Required Environment Variables

### Database Configuration
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=shopnova
DB_PASSWORD=your_secure_password_here
DB_NAME=shopnova
```

### JWT Configuration
```bash
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long
```

### Email Configuration (SendGrid)
```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=noreply@shopnova.com
EMAIL_FROM_NAME=ShopNova
```

### Service URLs
```bash
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
MONGODB_URI=mongodb://shopnova:your_secure_password_here@localhost:27017/shopnova
```

## Security Notes

- **Never commit `.env` files** to version control (they're in .gitignore)
- **Use strong, unique secrets** in production
- **Change default passwords** before deploying
- **Use different secrets** for each environment

## Docker Integration

The `docker-compose.yml` file uses environment variables:

```yaml
environment:
  POSTGRES_USER: ${DB_USER:-shopnova}
  POSTGRES_PASSWORD: ${DB_PASSWORD:-dev-password}
  POSTGRES_DB: ${DB_NAME:-shopnova}
```

This allows you to:
- Use environment variables from your `.env` file
- Have sensible defaults for development
- Override with production secrets in CI/CD

## Environment-Specific Files

### Development
```bash
cp .env.development .env
# Edit with your local development settings
```

### Production
```bash
cp .env.example .env.production
# Edit with production secrets
```

### Testing
```bash
cp .env.example .env.test
# Edit with test-specific settings
```

## Loading Environment Variables

Each service loads environment variables automatically:
- Node.js services use `process.env.VARIABLE_NAME`
- Docker services use `${VARIABLE_NAME:-default_value}` syntax
- Frontend uses Vite's `import.meta.env.VITE_VARIABLE_NAME`

## Common Issues

1. **"JWT_SECRET environment variable must be set in production"**
   - Set `NODE_ENV=development` for local development
   - Or provide a JWT_SECRET in your .env file

2. **Database connection errors**
   - Ensure PostgreSQL/MongoDB are running
   - Check DB_HOST, DB_PORT, and credentials in .env

3. **Email not sending**
   - Verify SENDGRID_API_KEY is valid
   - Check EMAIL_FROM and EMAIL_FROM_NAME are set

## Best Practices

1. **Use different secrets** for each environment
2. **Rotate secrets regularly** in production
3. **Use a secrets manager** (AWS Secrets Manager, HashiCorp Vault) for production
4. **Limit access** to production secrets
5. **Audit environment variable usage** regularly
