import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="text-center mt-20 text-gray-500">
      <p className="text-xl mb-2 font-medium">Nothing here yet...</p>
      <p className="text-sm">Tap <span className="font-semibold">+ New Entry</span> to add your first memory 🐣</p>
    </div>
  );
};

export default EmptyState;
