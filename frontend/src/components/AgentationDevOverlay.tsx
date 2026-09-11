'use client';

import React, { useEffect, useState } from 'react';

export function AgentationDevOverlay() {
  const [AgentationComponent, setAgentationComponent] = useState<any>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
      import('agentation')
        .then((mod) => {
          const Comp = mod.Agentation || mod.default;
          if (Comp) {
            setAgentationComponent(() => Comp);
          }
        })
        .catch((err) => {
          console.warn('Agentation dev widget load notice:', err.message);
        });
    }
  }, []);

  if (!AgentationComponent) return null;

  return <AgentationComponent />;
}
