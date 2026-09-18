import React, { useContext, useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { gql, useMutation } from '@apollo/client';
import { IExtendedOrder, Items } from '@/lib/utils/interfaces';
import './order-detail-modal.css';
import { useConfiguration } from '@/lib/hooks/useConfiguration';
import CustomButton from '../button';
import { ToastContext } from '@/lib/context/global/toast.context';
import { getGraphQLErrorMessage } from '@/lib/utils/methods/error';

interface IOrderDetailModalProps {
  visible: boolean;
  onHide: () => void;
  restaurantData: IExtendedOrder | null;
}

const RETRY_ORDER_REFUND = gql`
  mutation RetryOrderRefund($orderId: String!) {
    retryOrderRefund(orderId: $orderId) {
      _id
      refundStatus
      refundedAmount
      refundedAt
      refundError
    }
  }
`;

const REFUND_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Refund initiated',
  PROCESSING: 'Refund processing',
  SUCCESS: 'Refunded',
  FAILED: 'Refund failed',
};

const CANCELLED_BY_LABEL: Record<string, string> = {
  VENDOR: 'Store',
  ADMIN: 'Admin/support',
  CUSTOMER: 'Customer',
  RIDER: 'Delivery partner',
};

const OrderDetailModal: React.FC<IOrderDetailModalProps> = ({
  visible,
  onHide,
  restaurantData,
}) => {
  const { CURRENT_SYMBOL } = useConfiguration();
  const { showToast } = useContext(ToastContext);
  const [refund, setRefund] = useState<{
    refundStatus?: string | null;
    refundedAmount?: number | null;
    refundError?: string | null;
  } | null>(null);
  const [retryOrderRefund, { loading: retrying }] =
    useMutation(RETRY_ORDER_REFUND);

  // Reset the local refund override whenever a different order is opened, so a
  // retry on one order can't leak its result onto the next one shown.
  useEffect(() => {
    setRefund(null);
  }, [restaurantData?._id]);

  const handleRetryRefund = async () => {
    if (!restaurantData?._id) return;
    try {
      const res = await retryOrderRefund({
        variables: { orderId: restaurantData._id },
      });
      setRefund(res.data?.retryOrderRefund ?? null);
      showToast({
        type:
          res.data?.retryOrderRefund?.refundStatus === 'SUCCESS'
            ? 'success'
            : 'info',
        title: 'Refund retry',
        message: `Refund status: ${res.data?.retryOrderRefund?.refundStatus ?? 'unknown'}`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Refund retry',
        message:
          getGraphQLErrorMessage(err as Error) ?? 'Failed to retry the refund',
      });
    }
  };
  const calculateSubtotal = (items: Items[]) => {
    let Subtotal = 0;
    for (let i = 0; i < items.length; i++) {
      let itemTotal = items[i].price ?? items[i].variation?.price ?? 0;
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

  const refundStatus =
    refund?.refundStatus ?? restaurantData.refundStatus ?? 'NONE';
  const refundedAmount =
    refund?.refundedAmount ?? restaurantData.refundedAmount;
  const refundError = refund?.refundError ?? restaurantData.refundError;

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
      breakpoints={{ '760px': 'calc(100vw - 24px)' }}
      draggable={false}
    >
      <div className="order-details-container">
        <div className="order-main-stack">
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
                <span>
                  {restaurantData.restaurant?.name || 'Not available'}
                </span>
              </div>
              <div className="information-item">
                <span className="information-label">Restaurant Address</span>
                <span>
                  {restaurantData.restaurant?.address || 'Not available'}
                </span>
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
                        {(item.price ?? item.variation?.price ?? 0).toFixed(2)}
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
                <span
                  className={`payment-status ${restaurantData.paymentStatus?.toLowerCase() ?? ''}`}
                >
                  {restaurantData.paymentStatus}
                </span>
                {restaurantData.paymentGatewayRef && (
                  <span className="payment-gateway-ref">
                    Cashfree ref: {restaurantData.paymentGatewayRef}
                  </span>
                )}
              </div>
              <div className="paid-amount">
                <span className="paid-label">Paid Amount</span>
                <span className="paid-value">
                  {CURRENT_SYMBOL}
                  {(restaurantData.paidAmount ?? 0)?.toFixed(2)}
                </span>
              </div>
              {restaurantData.paymentMethod === 'CASHFREE' &&
                refundStatus !== 'NONE' && (
                  <div className="refund-block">
                    <div className="paid-amount">
                      <span className="paid-label">Refund</span>
                      <span
                        className={`payment-status ${refundStatus === 'SUCCESS' ? 'paid' : refundStatus === 'FAILED' ? 'failed' : ''}`}
                      >
                        {REFUND_STATUS_LABEL[refundStatus] ?? refundStatus}
                      </span>
                    </div>
                    {refundedAmount != null && (
                      <div className="paid-amount">
                        <span className="paid-label">
                          {refundStatus === 'SUCCESS'
                            ? 'Refunded amount'
                            : 'Refund amount'}
                        </span>
                        <span className="paid-value">
                          {CURRENT_SYMBOL}
                          {refundedAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {refundStatus === 'FAILED' && (
                      <>
                        {refundError && (
                          <p className="refund-error">{refundError}</p>
                        )}
                        <CustomButton
                          loading={retrying}
                          label="Retry refund"
                          className="refund-retry-button"
                          onClick={handleRetryRefund}
                        />
                      </>
                    )}
                  </div>
                )}
            </div>

            {/* Cancellation Section */}
            {restaurantData.orderStatus === 'CANCELLED' && (
              <div className="order-section">
                <h3 className="section-header">
                  <i className="pi pi-ban" aria-hidden="true" />
                  Cancellation
                </h3>
                <div className="information-grid">
                  <div className="information-item">
                    <span className="information-label">Cancelled by</span>
                    <span>
                      {restaurantData.cancelledByType
                        ? `${CANCELLED_BY_LABEL[restaurantData.cancelledByType] ?? restaurantData.cancelledByType}${
                            restaurantData.cancelledByName
                              ? ` — ${restaurantData.cancelledByName}`
                              : ''
                          }`
                        : 'Not available'}
                    </span>
                  </div>
                  <div className="information-item">
                    <span className="information-label">Reason</span>
                    <span>
                      {restaurantData.reason &&
                      restaurantData.reason.trim().toLowerCase() !==
                        'not available'
                        ? restaurantData.reason
                        : 'No reason recorded'}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default OrderDetailModal;
