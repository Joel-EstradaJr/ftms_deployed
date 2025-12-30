'use client';

import React from 'react';
import { ChartOfAccount } from '@/app/types/jev';

interface ViewAccountModalProps {
  account: ChartOfAccount;
  onClose: () => void;
}

const ViewAccountModal: React.FC<ViewAccountModalProps> = ({ account, onClose }) => {
  return (
    <div>
      <h1>Account Details</h1>
      <p>Code: {account.account_code}</p>
      <p>Name: {account.account_name}</p>
      <p>Type: {account.account_type}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default ViewAccountModal;
