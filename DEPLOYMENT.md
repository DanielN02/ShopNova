# 🚀 ShopNova Deployment Guide

## 📋 Overview

This guide shows how to deploy ShopNova using the **free tier strategy**:

- **Frontend**: Netlify (Free)
- **User-Order Service**: Render.com (Free)
- **Product Service**: Render.com (Free)
- **Notification Service**: Render.com (Free)
- **Databases**: Render.com Free Tier

## 🏗️ Architecture After Combination

```
ShopNova Free Deployment:
├── Frontend (Netlify)
│   └── React SPA
├── User-Order Service (Render)
│   ├── Authentication (Register/Login)
│   ├── Order Management
│   └── Basic Notifications
├── Product Service (Render)
│   ├── Product Catalog
│   ├── Search & Filtering
│   └── Recommendations
└── Notification Service (Render)
    └── Advanced Notifications (optional)
```

## 🌐 Step 1: Frontend Deployment (Netlify)

### 1. Build Frontend
```bash
cd frontend
npm run build
```

### 2. Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up/login
3. Drag `frontend/dist` folder to deploy area
4. Your site is live! 🎉

### 3. Configure Environment Variables
In Netlify dashboard:
```
VITE_API_BASE_URL=https://user-order-service.onrender.com
VITE_PRODUCT_API_URL=https://product-service.onrender.com
VITE_NOTIFICATION_API_URL=https://notification-service.onrender.com
```

## 🔧 Step 2: Backend Services (Render.com)

### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

### 2: Deploy User-Order Service

#### Create Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repo
3. Configure:
   - **Name**: `user-order-service`
   - **Root Directory**: `services/user-order-service`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### Environment Variables
```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=shopnova
RABBITMQ_URL=your-rabbitmq-url
REDIS_URL=your-redis-url
```

### 3: Deploy Product Service

#### Create Web Service
1. Click "New" → "Web Service"
2. Configure:
   - **Name**: `product-service`
   - **Root Directory**: `services/product-service`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### Environment Variables
```bash
NODE_ENV=production
PORT=3002
MONGODB_URI=your-mongodb-url
REDIS_URL=your-redis-url
ELASTICSEARCH_URL=your-elasticsearch-url
JWT_SECRET=your-super-secret-jwt-key
RABBITMQ_URL=your-rabbitmq-url
```

### 4: Deploy Notification Service (Optional)

#### Create Web Service
1. Click "New" → "Web Service"
2. Configure:
   - **Name**: `notification-service`
   - **Root Directory**: `services/notification-service`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### Environment Variables
```bash
NODE_ENV=production
PORT=3004
MONGO_URL=your-mongodb-url
JWT_SECRET=your-super-secret-jwt-key
RABBITMQ_URL=your-rabbitmq-url
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
```

## 🗄️ Step 3: Databases (Render.com)

### 1: PostgreSQL Database
1. Click "New" → "PostgreSQL"
2. **Name**: `shopnova-postgres`
3. **Database Name**: `shopnova`
4. **User**: `shopnova`
5. Copy connection details to service environment variables

### 2: MongoDB Database
1. Click "New" → "MongoDB"
2. **Name**: `shopnova-mongodb`
3. Copy connection string to service environment variables

### 3: Redis Instance
1. Click "New" → "Redis"
2. **Name**: `shopnova-redis`
3. Copy connection URL to service environment variables

## 🔗 Step 4: Update Frontend URLs

### Update API Configuration
In `frontend/src/app/services/api.ts`:

```typescript
const API_BASES = {
  users: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  products: import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:3002',
  notifications: import.meta.env.VITE_NOTIFICATION_API_URL || 'http://localhost:3004',
};
```

### Deploy Frontend Again
1. Make changes locally
2. Run `npm run build`
3. Redeploy to Netlify

## ✅ Step 5: Testing

### 1. Check Service Health
```bash
# User-Order Service
curl https://user-order-service.onrender.com/api/health

# Product Service  
curl https://product-service.onrender.com/api/health

# Notification Service
curl https://notification-service.onrender.com/api/health
```

### 2. Test API Endpoints
```bash
# Register User
curl -X POST https://user-order-service.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Get Products
curl https://product-service.onrender.com/api/products
```

## 💰 Cost Breakdown

### Free Tier Usage:
- **Netlify**: $0/month (Frontend)
- **Render.com**: 
  - 3 Web Services: $0/month (within free tier limits)
  - PostgreSQL: $0/month (free tier)
  - MongoDB: $0/month (free tier)
  - Redis: $0/month (free tier)

**Total Cost**: $0/month! 🎉

### Usage Limits:
- **Render Web Services**: 750 hours/month (enough for 24/7)
- **PostgreSQL**: 90 days free, then ~$7/month
- **MongoDB**: 512MB free
- **Redis**: 25MB free

## 🔧 Troubleshooting

### Common Issues:

#### 1. Database Connection Errors
```bash
# Check if database is running
# Verify connection string format
# Ensure IP whitelisting (if applicable)
```

#### 2. Service Not Starting
```bash
# Check Render logs
# Verify environment variables
# Ensure build completed successfully
```

#### 3. CORS Errors
```bash
# Update CORS origins in service
# Add your Netlify domain to allowed origins
```

#### 4. WebSocket Connection Issues
```bash
# WebSocket may not work on Render free tier
# Use polling fallback or upgrade plan
```

## 🚀 Next Steps

### After Successful Deployment:

1. **Monitor Usage**: Check Render dashboard for usage metrics
2. **Set Up Alerts**: Get notified about service issues
3. **Custom Domain**: Add custom domain to Netlify
4. **SSL Certificates**: Already handled by Netlify/Render
5. **Backup Strategy**: Regular database backups

### Scaling Up:

When you need to scale beyond free tier:
- **Render Paid Plans**: $7-50/month per service
- **AWS/GCP**: More control, higher cost
- **DigitalOcean**: $5-20/month per droplet

## 📞 Support

- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **GitHub Issues**: Create issues in your repository

## 🎉 Congratulations!

You now have a **fully functional e-commerce platform** deployed for **$0/month**!

- ✅ **Frontend**: Live on Netlify
- ✅ **Backend**: 3 services on Render
- ✅ **Databases**: PostgreSQL, MongoDB, Redis
- ✅ **API Documentation**: Available at `/api/docs`
- ✅ **Real-time Features**: WebSocket support
- ✅ **Scalable Architecture**: Microservices ready

**Your ShopNova is now live!** 🛍️✨
