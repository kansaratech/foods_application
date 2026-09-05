import '@/lib/ui/useable-components/management-page/management.css';
import OrdersSuperAdminHeader from '@/lib/ui/screen-components/protected/super-admin/order/header/screen-header';
import OrderSuperAdminMain from '@/lib/ui/screen-components/protected/super-admin/order/main';
const OrderSuperAdminScreen = () => {
  return (
    <div className="management-page management-orders">
      <OrdersSuperAdminHeader />
      <OrderSuperAdminMain />
    </div>
  );
};

export default OrderSuperAdminScreen;
