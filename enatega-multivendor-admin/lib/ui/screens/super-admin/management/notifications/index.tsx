import '@/lib/ui/useable-components/management-page/management.css';
//Components
import NotificationForm from '@/lib/ui/screen-components/protected/super-admin/notifications/form';
import NotificationHeader from '@/lib/ui/screen-components/protected/super-admin/notifications/view/header/screen-header';
import NotificationMain from '@/lib/ui/screen-components/protected/super-admin/notifications/view/main';

//Hooks
import { useState } from 'react';

export default function NotificationsScreen() {
  //States
  const [visible, setVisible] = useState(false);
  // Handle button click
  const handleButtonClick = () => {
    setVisible(true);
  };
  return (
    <div className="management-page management-notifications">
      <NotificationHeader handleButtonClick={handleButtonClick} />
      <NotificationMain />
      <NotificationForm setVisible={setVisible} visible={visible} />
    </div>
  );
}
