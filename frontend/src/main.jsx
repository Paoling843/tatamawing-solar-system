import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MessagePanelProvider } from './context/MessagePanelContext.jsx';
import App from './App.jsx';
import './index.css'
import './App.css'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    {
      <BrowserRouter>
      {
        <AuthProvider>
          {
            <MessagePanelProvider>
              <App />
            </MessagePanelProvider>
          }
        </AuthProvider>
      }
      </BrowserRouter>
    }
  </StrictMode>,
)
