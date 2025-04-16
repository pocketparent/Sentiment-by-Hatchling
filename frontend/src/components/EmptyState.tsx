import React from 'react';
import { Camera } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="text-center mt-20 text-clay-brown">
      <div className="flex justify-center mb-4">
        <div className="bg-soft-beige p-4 rounded-full">
          <Camera size={48} className="text-clay-brown opacity-70" />
        </div>
      </div>
      <p className="text-xl mb-3 font-medium">Ready to start capturing your special moments?</p>
      <p className="text-sm">Tap the <span className="font-semibold">+</span> button to add your first memory!</p>
    </div>
  );
};

export default EmptyState;
