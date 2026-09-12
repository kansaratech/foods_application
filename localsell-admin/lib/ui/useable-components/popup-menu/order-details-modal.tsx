import React from 'react';
import { Dialog } from 'primereact/dialog';
import { IExtendedOrder, Items } from '@/lib/utils/interfaces';
import './order-detail-modal.css';
import { useConfiguration } from '@/lib/hooks/useConfiguration';

interface IOrderDetailModalProps {
  visible: boolean;
  onHide: () => void;
  restaurantData: IExtendedOrder | null;
}

const OrderDetailModal: React.FC<IOrderDetailModalProps> = ({
  visible,
  onHide,
  restaurantData,
}) => {
  const { CURRENT_SYMBOL } = useConfiguration();
  const calculateSubtotal = (items: Items[]) => {
    let Subtotal = 0;
    for (let i = 0; i < items.length; i++) {
      let itemTotal = items[i].variation?.price ?? 0;
      if (items[i]?.addons) {
        items[i].addons?.forEach((addon) => {
          addon.options.forEach((option) => {
            itemTotal += (option.price ?? 0) * (option.quantity ?? 1);
          });
        });
      }
      Subtotal += itemTotal * items[i].quantity;
    }
    return Subtotal.toFixed(2);
  };
  if (!restaurantData) return null;

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="order-dialog-heading">
          <span className="order-dialog-eyebrow">ORDER DETAILS</span>
          <span>#{restaurantData.orderId}</span>
        </div>
      }
      className="admin-order-dialog"
      breakpoints={{ '960px': '90vw', '640px': 'calc(100vw - 24px)' }}
    >
      <div className="order-details-container">
        {/* Customer Information Section */}
        <div className="order-section order-customer">
          <h3 className="section-header">
            <i className="pi pi-user" aria-hidden="true" />
            Customer Information
          </h3>
          {restaurantData.user ? (
            <div className="information-grid">
              <div className="information-item">
                <span className="information-label">Name</span>
                <span>{restaurantData.user.name || 'Not available'}</span>
              </div>
              <div className="information-item">
                <span className="information-label">Phone</span>
                <span>{restaurantData.user.phone || 'Not available'}</span>
              </div>
              <div className="information-item">
                <span className="information-label">Email</span>
                <span>{restaurantData.user.email || 'Not available'}</span>
              </div>
            </div>
          ) : (
            <p>Customer information is not available</p>
          )}
        </div>

        <div className="order-section order-restaurant">
          <h3 className="section-header">
            <i className="pi pi-shop" aria-hidden="true" />
            Restaurant Information
          </h3>
          <div className="information-grid">
            <div className="information-item">
              <span className="information-label">Restaurant</span>
              <span>{restaurantData.restaurant?.name || 'Not available'}</span>
            </div>
            <div className="information-item">
              <span className="information-label">Restaurant Address</span>
              <span>{restaurantData.restaurant?.address || 'Not available'}</span>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="order-section order-items">
          <h3 className="section-header">
            <i className="pi pi-shopping-bag" aria-hidden="true" />
            Items
          </h3>
          {restaurantData.items && restaurantData.items.length > 0 ? (
            <div className="item-list">
              {restaurantData.items.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-row">
                    <span className="item-name">{item.title}</span>
                    <span className="item-price">
                      {item.quantity} &times; {CURRENT_SYMBOL}
                      {(item.variation?.price ?? 0).toFixed(2)}
                    </span>
                  </div>
                  {item.addons
                    ?.flatMap((addon) => addon.options)
                    .map((option, optionIndex) => (
                      <div key={optionIndex} className="item-row item-addon">
                        <span>
                          + {option.title}
                          {(option.quantity ?? 1) > 1
                            ? ` (${option.quantity})`
                            : ''}
                        </span>
                        <span className="item-price">
                          {CURRENT_SYMBOL}
                          {(
                            (option.price ?? 0) * (option.quantity ?? 1)
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <p>No items available</p>
          )}
        </div>

        <div className="order-financial-grid">
          {/* Charges Section */}
          <div className="order-section order-charges">
            <h3 className="section-header">
              <i className="pi pi-receipt" aria-hidden="true" />
              Charges
            </h3>
            <div className="charges-table">
              <div className="charges-row">
                <span>Subtotal</span>
                <span>
                  {CURRENT_SYMBOL}
                  {calculateSubtotal(restaurantData?.items || [])}
                </span>
              </div>
              <div className="charges-row">
                <span>Delivery Fee</span>
                <span>
                  {CURRENT_SYMBOL}
                  {(restaurantData.deliveryCharges ?? 0)?.toFixed(2)}
                </span>
              </div>
              <div className="charges-row">
                <span>Tax Charges</span>
                <span>
                  {CURRENT_SYMBOL}
                  {(restaurantData.taxationAmount ?? 0)?.toFixed(2)}
                </span>
              </div>
              <div className="charges-row">
                <span>Tip</span>
                <span>
                  {CURRENT_SYMBOL}
                  {(restaurantData.tipping ?? 0)?.toFixed(2)}
                </span>
              </div>
              {(restaurantData.discountAmount ?? 0) > 0 && (
                <div className="charges-row">
                  <span>Discount</span>
                  <span>
                    -{CURRENT_SYMBOL}
                    {(restaurantData.discountAmount ?? 0)?.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="charges-row total-row">
                <strong>Total</strong>
                <strong>
                  {CURRENT_SYMBOL}
                  {(restaurantData.orderAmount ?? 0).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          <div className="order-side-stack">
            {/* Payment Method Section */}
            <div className="order-section">
              <h3 className="section-header">
                <i className="pi pi-wallet" aria-hidden="true" />
                Payment Method
              </h3>
              <div className="payment-section">
                <span className="payment-type">
                  {restaurantData.paymentMethod}
                </span>
              </div>
              <div className="paid-amount">
                <span className="paid-label">Paid Amount</span>
                <span className="paid-value">
                  {CURRENT_SYMBOL}
                  {(restaurantData.paidAmount ?? 0)?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Rider Information Section */}
            {restaurantData.rider && (
              <div className="order-section">
                <h3 className="section-header">
                  <i className="pi pi-truck" aria-hidden="true" />
                  Rider Information
                </h3>
                <div className="information-grid">
                  <div className="information-item">
                    <span className="information-label">Name</span>
                    <span>{restaurantData.rider.name || 'Not available'}</span>
                  </div>
                  <div className="information-item">
                    <span className="information-label">Username</span>
                    <span>
                      {restaurantData.rider.username || 'Not available'}
                    </span>
                  </div>
                  <div className="information-item">
                    <span className="information-label">Availability</span>
                    <span>
                      {restaurantData.rider.available === undefined
                        ? 'Not available'
                        : restaurantData.rider.available
                          ? 'Available'
                          : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Address Section */}
            <div className="order-section">
              <h3 className="section-header">
                <i className="pi pi-map-marker" aria-hidden="true" />
                Delivery Address
              </h3>
              <p>
                {restaurantData.deliveryAddress?.deliveryAddress ||
                  'Not available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default OrderDetailModal;
