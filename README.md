# RetailFlow — Multi-Business Retail Billing & Inventory SaaS

RetailFlow is a production-oriented, mobile-first Retail Billing and Inventory Management SaaS platform designed for small and medium retailers in India.

The platform employs a multi-tenant business architecture where a **Super Admin** manages multiple retail stores, and each **Business Owner** has separate credentials and complete data isolation for their billing, catalog, stock adjustments, customer ledger, and analytical reports.

---

## 1. Supabase Connection Configuration

The application is pre-configured and connected directly to the project's Supabase database:

| Parameter | Value |
| :--- | :--- |
| **Project Name** | `Retails` |
| **Database Reference ID** | `ozdxhhcxubfawdcoihkx` |
| **Supabase API URL** | `https://ozdxhhcxubfawdcoihkx.supabase.co` |
| **Supabase Dashboard URL** | `https://supabase.com/dashboard/project/ozdxhhcxubfawdcoihkx` |
| **Publishable (Anon) Key** | `sb_publishable_Pbtxjz114o6Q0Vxr9XJWCw_eSadQnTP` |
| **Server-Side Secret Key** | Configure in Vercel Environment variables (`SUPABASE_SERVICE_ROLE_KEY`) |

### Environment Variables

#### Frontend (`.env` / `.env.example`)
```env
VITE_SUPABASE_URL=https://ozdxhhcxubfawdcoihkx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Pbtxjz114o6Q0Vxr9XJWCw_eSadQnTP
VITE_SUPABASE_PROJECT_ID=ozdxhhcxubfawdcoihkx
```

#### Backend / Serverless (Vercel Project Settings)
```env
SUPABASE_URL=https://ozdxhhcxubfawdcoihkx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> **Security Note:** The `SUPABASE_SERVICE_ROLE_KEY` is strictly server-side and never exposed to the frontend bundle or client browser.

---

## 2. Multi-Business Architecture & Security

There are two distinct user roles:

1. **SUPER ADMIN**
   - Access URL: `/admin/login` -> `/admin`
   - Governs all tenant businesses on the platform.
   - Enrolls new retail businesses and generates auth credentials server-side with pre-confirmed email.
   - Activates or suspends businesses with immediate real-time effect.
   - Monitored with strict server-side verification (`role === 'super_admin'`).

2. **BUSINESS OWNER**
   - Access URL: `/login` -> `/dashboard`
   - Accesses strictly their own store data (`products`, `customers`, `sales`, `sale_items`, `stock_movements`).
   - If their account is suspended, all business access is blocked with a prominent suspension screen.
   - Can recover or update their store password using Supabase OTP recovery authentication.

---

## 3. Key Feature Modules

### ⚡ Rapid Mobile-First POS Billing (`/billing`)
- Instant search by product name, category, SKU, or barcode.
- Device camera & laser barcode gun support.
- Fast cart quantity steppers (`+` / `-` / direct input).
- Discount calculation (Flat ₹ or Percentage %).
- Configurable GST rates (0%, 5%, 12%, 18%, 28%).
- Multi-mode payment: Cash, UPI, Card, Other.
- Payment status: Paid, Partial, Unpaid.
- Customer dropdown or quick unregistered Walk-in customer.
- Unique invoice numbering (`INV-YYMMDD-XXXX`).
- Atomic multi-step database persistence (Sales record, Sale items, Stock movements audit, Product quantity deduction).
- **Negative stock prevention** (validates against real available inventory).
- Thermal receipt and standard A4 invoice format.
- Print invoice & instant WhatsApp/Web Share API sharing.
- Celebratory confetti on completed transactions.

### 📦 Inventory & Stock Management (`/inventory`)
- Full catalog management with Indian Rupee (₹) pricing.
- Products work seamlessly without requiring SKU or barcode.
- Real-time stock alerts for low inventory (≤ 5 units).
- Stock Adjustment modal: Add Stock (Restock), Damage/Wastage, or Physical Audit count.
- Full stock movement audit history for every item.
- Total inventory valuation metrics (cost valuation vs projected MRP retail potential).
- Filter by category, low-stock, and instant search.
- Export inventory catalog to CSV.

### 👥 Customer Ledger (`/customers`)
- Complete customer directory (Name, Phone, Address).
- Computed customer lifetime purchases.
- Outstanding due balance tracking from unpaid or partial bills.
- Detailed customer order history modal with invoice drill-down.
- Support for unregistered walk-in customers.
- Export customer ledger to CSV.

### 📊 Sales Reports & Analytics (`/reports`)
- Daily, Weekly, Monthly, and Custom date range filters.
- Recharts visualizations: Revenue area trends & Payment method breakdown (Cash / UPI / Card / Other).
- Top-selling products ranking by volume and revenue.
- Detailed transaction log with one-click invoice reprint/share.
- Export comprehensive financial reports to CSV.

### 🛡️ Super Admin Control Center (`/admin`)
- Platform-wide store registration metrics (Total, Active, Suspended).
- "Register New Business" modal:
  1. Creates Supabase Auth user securely server-side.
  2. Generates unique UUID business ID.
  3. Inserts into `businesses` and `profiles`.
  4. Displays credentials to the admin once with a "Copy Details" button.
- Instant Activate/Suspend toggle for tenant access control.
- Search and filter registered stores by name, email, or mobile.

---

## 4. Database Schema Reference

The database consists of 7 tables in PostgreSQL on Supabase:
- `businesses`: Master tenant records (`id`, `name`, `email`, `phone`, `address`, `status`, `created_at`)
- `profiles`: User profiles linked to auth (`user_id`, `full_name`, `role`, `business_id`, `created_at`)
- `products`: Store catalog (`id`, `business_id`, `name`, `sku`, `barcode`, `category`, `purchase_price`, `selling_price`, `stock_quantity`, `unit`, `created_at`)
- `customers`: Store customers (`id`, `business_id`, `name`, `phone`, `address`, `created_at`)
- `sales`: Billing invoices (`id`, `business_id`, `customer_id`, `invoice_number`, `subtotal`, `discount`, `tax_amount`, `total`, `payment_method`, `payment_status`, `created_at`)
- `sale_items`: Invoice items (`id`, `business_id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `total`)
- `stock_movements`: Stock audit log (`id`, `business_id`, `product_id`, `quantity`, `movement_type`, `created_at`)

Full SQL schema and RLS policies are preserved in `supabase/schema.sql`.

---

## 5. Development & Deployment

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

### Production Build
```bash
npm run build
```

### Deploying to Vercel
1. Push repository to GitHub.
2. Import project in [Vercel](https://vercel.com).
3. Set the Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`: `https://ozdxhhcxubfawdcoihkx.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_Pbtxjz114o6Q0Vxr9XJWCw_eSadQnTP`
   - `SUPABASE_URL`: `https://ozdxhhcxubfawdcoihkx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `[Your Supabase Service Role Secret Key]`
4. Click **Deploy**. Vercel will build the Vite frontend and host the `/api/admin/*` serverless functions automatically according to `vercel.json`.

---

## 6. Super Admin Setup Guide
1. Navigate to `/admin/login`.
2. Click the **"First-Time Setup"** tab.
3. Enter your Administrator Full Name, Email, and Master Password.
4. If setting up for the first time before adding the service key to `.env`, paste your Supabase Service Role Key in the field provided.
5. Click **Initialize Super Admin**. You can now log into `/admin` and begin enrolling retail stores!
