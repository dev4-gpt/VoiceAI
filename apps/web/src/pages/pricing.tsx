import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { PricingPage } from './PricingPage';
import '../index.css';

hydrateRoot(document.getElementById('root')!, <PricingPage />);
