#!/usr/bin/env bash
# =============================================================================
# ShopNova — Parallel Ralph Loop Setup
# Creates 8 git worktrees, one per workstream, each with its own branch + progress
# Usage: bash .ralph/setup-parallel.sh
# =============================================================================

set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)

echo "=== ShopNova Parallel Build Setup ==="
echo ""

# Ensure we're on a clean branch
if [[ -n $(git status --porcelain) ]]; then
  echo "WARNING: Uncommitted changes detected. Committing first..."
  git add -A
  git commit -m "pre-parallel: prepare for parallel workstream build" --allow-empty
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "Base branch: $CURRENT_BRANCH"
echo ""

# Workstream definitions: id:slug:display_name
declare -a WORKSTREAMS=(
  "w1:integration:Frontend-Backend Integration"
  "w2:websocket:WebSocket Real-time"
  "w3:security:Rate Limiting & Security"
  "w4:docker:Service Dockerfiles"
  "w5:testing:Frontend Testing"
  "w6:upload:Image Upload"
  "w7:admin-crud:Admin CRUD Actions"
  "w8:pagination:Pagination & Search"
)

mkdir -p .worktrees

for entry in "${WORKSTREAMS[@]}"; do
  IFS=':' read -r id slug display <<< "$entry"
  branch="shopnova-${slug}"
  worktree_dir=".worktrees/${id}-${slug}"

  echo "[${id}] Creating worktree -> $worktree_dir (branch: $branch)"

  # Create worktree (skip if already exists)
  if [ -d "$worktree_dir" ]; then
    echo "  -> Worktree already exists, skipping..."
  else
    git branch "$branch" 2>/dev/null || git branch -f "$branch" HEAD
    git worktree add "$worktree_dir" "$branch"
  fi

  # Create per-workstream PROGRESS.md with scoped tasks
  case "$id" in
    w1)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W1 — Frontend-Backend Integration

## Build Tasks
- [ ] Set up Axios API client base with interceptors and JWT token handling <-- NEXT
- [ ] Connect user registration page to user-service POST /api/auth/register
- [ ] Connect login page to user-service POST /api/auth/login, store JWT in Zustand
- [ ] Connect product catalog page to product-service GET /api/products
- [ ] Connect single product page to product-service GET /api/products/:id
- [ ] Connect cart/checkout flow to order-service POST /api/orders
- [ ] Connect order history page to order-service GET /api/orders
- [ ] Connect user profile page to user-service GET/PUT /api/auth/profile
- [ ] Add auth guards (ProtectedRoute component) for authenticated pages
- [ ] Connect notification bell to notification-service GET /api/notifications
- [ ] Add environment-based API URL configuration (VITE_*_SERVICE_URL)
- [ ] Integration smoke test: register -> login -> browse -> order flow
PROGRESS_EOF
      ;;
    w2)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W2 — WebSocket Real-time

## Build Tasks
- [ ] Create WebSocket client utility with auto-reconnect and JWT auth <-- NEXT
- [ ] Add WebSocket connection to order-service for real-time order status
- [ ] Create useOrderUpdates hook for live order status in React
- [ ] Add real-time notification push via WebSocket (new order, status change)
- [ ] Add connection status indicator component (connected/reconnecting/offline)
- [ ] Wire WebSocket events into Zustand notification store
- [ ] Add WebSocket heartbeat/ping-pong keep-alive
- [ ] Test: verify order status updates appear in real-time on order page
PROGRESS_EOF
      ;;
    w3)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W3 — Rate Limiting & Security

## Build Tasks
- [ ] Add express-rate-limit middleware to user-service (auth endpoints) <-- NEXT
- [ ] Add rate limiting to product-service (search and write endpoints)
- [ ] Add rate limiting to order-service (order creation)
- [ ] Add rate limiting to notification-service
- [ ] Add helmet middleware to all services for security headers
- [ ] Add CORS configuration with allowed origins per service
- [ ] Add input sanitization middleware (xss-clean or custom)
- [ ] Add request logging middleware (morgan or custom structured logs)
PROGRESS_EOF
      ;;
    w4)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W4 — Service Dockerfiles

## Build Tasks
- [ ] Create Dockerfile for user-service (multi-stage, node:20-alpine) <-- NEXT
- [ ] Create Dockerfile for product-service
- [ ] Create Dockerfile for order-service
- [ ] Create Dockerfile for notification-service
- [ ] Create Dockerfile for frontend (nginx serve)
- [ ] Update docker-compose.yml to build from Dockerfiles instead of images
- [ ] Add .dockerignore files to all services and frontend
- [ ] Add health check endpoints verification in docker-compose
PROGRESS_EOF
      ;;
    w5)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W5 — Frontend Testing

## Build Tasks
- [ ] Set up Vitest + React Testing Library in frontend <-- NEXT
- [ ] Test ProductCard component (renders name, price, image, add-to-cart)
- [ ] Test Navbar component (logo, nav links, cart badge, auth state)
- [ ] Test CartPage (items list, quantity update, remove, total calculation)
- [ ] Test AuthForm component (login/register toggle, validation, submit)
- [ ] Test useCartStore Zustand store (add, remove, update quantity, clear)
- [ ] Test useAuthStore Zustand store (login, logout, token persistence)
- [ ] Test API service layer with mocked axios (products, orders, auth)
PROGRESS_EOF
      ;;
    w6)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W6 — Image Upload

## Build Tasks
- [ ] Add multer middleware to product-service for image uploads <-- NEXT
- [ ] Create POST /api/products/:id/images endpoint (admin only)
- [ ] Add image storage to local uploads/ directory with unique filenames
- [ ] Serve uploaded images via static file middleware
- [ ] Create ImageUpload React component with drag-and-drop
- [ ] Wire ImageUpload into admin product create/edit forms
- [ ] Add image preview and delete functionality
- [ ] Add file size and type validation (max 5MB, jpg/png/webp only)
PROGRESS_EOF
      ;;
    w7)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W7 — Admin CRUD Actions

## Build Tasks
- [ ] Create admin product list page with edit/delete buttons <-- NEXT
- [ ] Wire admin product create form to POST /api/products
- [ ] Wire admin product edit form to PUT /api/products/:id
- [ ] Wire admin product delete to DELETE /api/products/:id with confirmation
- [ ] Create admin order management page (list all orders, filter by status)
- [ ] Wire admin order status update to PUT /api/orders/:id/status
- [ ] Create admin user list page with role management
- [ ] Add admin dashboard with analytics charts (revenue, orders, top products)
PROGRESS_EOF
      ;;
    w8)
      cat > "${worktree_dir}/PROGRESS.md" << 'PROGRESS_EOF'
# ShopNova W8 — Pagination & Search

## Build Tasks
- [ ] Add cursor/offset pagination to product-service GET /api/products <-- NEXT
- [ ] Add pagination to order-service GET /api/orders and GET /api/orders/admin/all
- [ ] Create reusable Pagination component (page numbers, prev/next, page size)
- [ ] Wire pagination into product catalog page with URL query params
- [ ] Wire pagination into admin order list page
- [ ] Add product search with filters (category, price range, rating, sort)
- [ ] Create SearchFilters component (sidebar or dropdown filters)
- [ ] Connect search to Elasticsearch with MongoDB fallback
PROGRESS_EOF
      ;;
  esac

  # Ensure first unchecked task has <-- NEXT marker
  if ! grep -q '<-- NEXT' "${worktree_dir}/PROGRESS.md"; then
    awk '/^- \[ \]/{if(!n){$0=$0" <-- NEXT"; n=1}}1' "${worktree_dir}/PROGRESS.md" > "${worktree_dir}/PROGRESS.md.tmp" && mv "${worktree_dir}/PROGRESS.md.tmp" "${worktree_dir}/PROGRESS.md"
  fi

  # Copy .ralph/ directory into worktree
  mkdir -p "${worktree_dir}/.ralph/logs"
  cp "${ROOT}/.ralph/PROMPT.md" "${worktree_dir}/.ralph/PROMPT.md"
  cp "${ROOT}/.ralph/loop.sh" "${worktree_dir}/.ralph/loop.sh"

  # Create per-workstream FEATURE_FOCUS.md with scope rules
  case "$id" in
    w1)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W1: Frontend-Backend Integration.
This is the critical P0 workstream that connects the React frontend to the Express backend services.

### Rules for parallel development:
1. Only create/modify these files:
   - frontend/src/app/services/ — API client modules (axios)
   - frontend/src/app/store/ — Zustand stores (auth token, user state)
   - frontend/src/app/components/ — Auth guards, error boundaries
   - frontend/src/app/pages/ — Wire existing pages to real API calls
   - frontend/src/app/types/ — Shared TypeScript interfaces

2. Do NOT modify:
   - Backend service code (services/*)
   - Docker configuration
   - Package.json dependencies (unless implementation plan says so)

3. Integration pattern:
   - Use environment variables (VITE_*_SERVICE_URL) for API base URLs
   - Add JWT token to Authorization header via Axios interceptor
   - Handle loading/error states in all API-connected components
   - Gracefully fallback to mock data when backend is unavailable
FOCUS_EOF
      ;;
    w2)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W2: WebSocket Real-time.
This adds live order status updates and push notifications via WebSocket.

### Rules for parallel development:
1. Only create/modify these files:
   - frontend/src/app/services/websocket.ts — WebSocket client
   - frontend/src/app/hooks/useOrderUpdates.ts — React hook for live updates
   - frontend/src/app/components/ConnectionStatus.tsx — Connection indicator
   - frontend/src/app/store/ — Add WebSocket state to relevant stores
   - services/order-service/src/ — WebSocket server setup (if not already present)

2. Do NOT modify:
   - Other service code (user, product, notification services)
   - Unrelated frontend pages or components
   - Docker configuration
FOCUS_EOF
      ;;
    w3)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W3: Rate Limiting & Security.
This adds security hardening across all backend services.

### Rules for parallel development:
1. Only create/modify these files:
   - services/*/src/middleware/ — Rate limiting, helmet, CORS, sanitization middleware
   - services/*/src/index.ts or app.ts — Wire middleware into Express app

2. Do NOT modify:
   - Frontend code
   - Business logic in routes/controllers
   - Database schemas
   - Docker configuration
FOCUS_EOF
      ;;
    w4)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W4: Service Dockerfiles.
This creates production-ready Dockerfiles for all services and the frontend.

### Rules for parallel development:
1. Only create/modify these files:
   - services/*/Dockerfile — Per-service Dockerfiles
   - frontend/Dockerfile — Frontend build + nginx serve
   - services/*/.dockerignore — Docker ignore files
   - frontend/.dockerignore
   - docker-compose.yml — Update service definitions to use build context

2. Do NOT modify:
   - Application source code
   - Package.json files
   - Database schemas
FOCUS_EOF
      ;;
    w5)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W5: Frontend Testing.
This adds comprehensive unit tests to the React frontend using Vitest + React Testing Library.

### Rules for parallel development:
1. Only create/modify these files:
   - frontend/src/**/__tests__/ or frontend/src/**/*.test.ts(x) — Test files
   - frontend/vitest.config.ts or frontend/vite.config.ts — Test configuration
   - frontend/src/test/ — Test utilities, setup, mocks
   - frontend/package.json — Only to add vitest/testing-library devDependencies

2. Do NOT modify:
   - Application source code (components, pages, stores, services)
   - Backend service code
   - Docker configuration
FOCUS_EOF
      ;;
    w6)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W6: Image Upload.
This adds product image upload functionality with multer on the backend and a drag-and-drop UI.

### Rules for parallel development:
1. Only create/modify these files:
   - services/product-service/src/routes/ — Image upload endpoint
   - services/product-service/src/middleware/ — Multer configuration
   - frontend/src/app/components/ImageUpload.tsx — Upload component
   - frontend/src/app/services/product.ts — Add upload API call

2. Do NOT modify:
   - Other service code (user, order, notification)
   - Unrelated frontend pages
   - Docker configuration
FOCUS_EOF
      ;;
    w7)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W7: Admin CRUD Actions.
This creates the admin panel pages for managing products, orders, and users.

### Rules for parallel development:
1. Only create/modify these files:
   - frontend/src/app/pages/admin/ — Admin page components
   - frontend/src/app/components/admin/ — Admin-specific components
   - frontend/src/app/services/ — API calls for admin actions
   - frontend/src/app/store/ — Admin-related state

2. Do NOT modify:
   - Backend service code (admin endpoints already exist)
   - Customer-facing pages
   - Docker configuration
FOCUS_EOF
      ;;
    w8)
      cat > "${worktree_dir}/.ralph/FEATURE_FOCUS.md" << FOCUS_EOF
## CURRENT FEATURE FOCUS

You are building ONLY W8: Pagination & Search.
This adds pagination to list endpoints and enhanced search/filtering to the product catalog.

### Rules for parallel development:
1. Only create/modify these files:
   - services/product-service/src/routes/ — Add pagination params
   - services/order-service/src/routes/ — Add pagination params
   - frontend/src/app/components/Pagination.tsx — Reusable pagination component
   - frontend/src/app/components/SearchFilters.tsx — Filter sidebar/dropdown
   - frontend/src/app/pages/ — Wire pagination and filters into catalog and admin pages

2. Do NOT modify:
   - Auth/user service code
   - Notification service code
   - Docker configuration
FOCUS_EOF
      ;;
  esac

  echo "  -> Created PROGRESS.md and FEATURE_FOCUS.md"
done

echo ""
echo "=== Setup Complete ==="
echo ""
echo "8 worktrees created in .worktrees/"
echo ""
echo "To launch all loops automatically:"
echo "  bash .ralph/launch.sh"
echo ""
echo "To check progress:"
echo "  bash .ralph/check-progress.sh"
echo ""
echo "To merge all when done:"
echo "  bash .ralph/merge-all.sh"
