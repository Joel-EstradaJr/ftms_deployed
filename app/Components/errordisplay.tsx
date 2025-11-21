import React from 'react';
import '../styles/components/error.css';

type ErrorDisplayProps = {
  errorCode?: number | string | null;
  onRetry?: () => void;
  onClose?: () => void;
};

const shortDescription = (code?: number | string | null) => {
  const c = typeof code === 'string' && /^\d+/.test(code as string) ? Number(code) : code;
  switch (c) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Page not found';
    case 408:
      return 'Request Timeout';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 'network':
      return 'Network Error';
    case 'construction':
      return 'Under Construction';
    default:
      return 'Something went wrong';
  }
};

const getIconForError = (code?: number | string | null) => {
  if (code === 'construction') {
    return '🚧';
  }
  return '⚠️';
};

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errorCode, onRetry, onClose }) => {
  if (!errorCode) return null;

  const isConstruction = errorCode === 'construction';

  return (
    <div className="errorDisplay" role="alert" aria-live="assertive">
      {isConstruction && (
        <div className="error-bus-animation">
          <div className="error-bus">
            <div className="wheel"></div>
            <div className="wheel"></div>
          </div>
        </div>
      )}
      
      <div className="errorInner">
        <div className="errorIcon" aria-hidden>
          {getIconForError(errorCode)}
        </div>
        <div className="errorText">
          <div className="errorTitle">
            {isConstruction ? 'Under Construction' : `Error ${errorCode}`}
          </div>
          <div className="errorSubtitle">
            {isConstruction 
              ? 'This page is currently being built. Please check back soon!' 
              : shortDescription(errorCode)
            }
          </div>
        </div>
        <div className="errorActions">
          {onRetry && (
            <button className="btn retry" onClick={onRetry}>
              Retry
            </button>
          )}
          {onClose && (
            <button className="btn close" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
