import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { LandingPage } from './LandingPage';
import '../index.css';

hydrateRoot(document.getElementById('root')!, <LandingPage />);
