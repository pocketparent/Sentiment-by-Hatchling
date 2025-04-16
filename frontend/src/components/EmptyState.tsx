import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="text-center mt-20 text-clay-brown">
      <p className="text-xl mb-3 font-medium">No memories yet. Let's make one ✨</p>
      <p className="text-sm">Tap the <span className="font-semibold">+</span> button below to add your first memory</p>
      <div className="mt-8 flex justify-center">
        <img 
          src="/empty-journal.svg" 
          alt="Empty journal" 
          className="w-40 h-40 opacity-50"
          onError={(e) => {
            // Fallback if image doesn't exist
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

export default EmptyState;
