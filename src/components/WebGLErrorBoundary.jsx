import { Component } from 'react';

export default class WebGLErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('WebGL Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#050510',
                    color: '#ff0066',
                    fontFamily: "'Orbitron', monospace",
                    textAlign: 'center',
                    padding: '40px',
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>⚠ WebGL Error</h2>
                        <p style={{ color: '#8888bb', fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', maxWidth: '400px' }}>
                            Your browser could not initialize WebGL. Please ensure:
                        </p>
                        <ul style={{ color: '#8888bb', fontFamily: "'Rajdhani', sans-serif", textAlign: 'left', marginTop: '12px', lineHeight: '1.8' }}>
                            <li>Hardware acceleration is enabled in your browser settings</li>
                            <li>Your GPU drivers are up to date</li>
                            <li>You&apos;re using a modern browser (Chrome, Firefox, Edge)</li>
                        </ul>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: '24px',
                                padding: '10px 32px',
                                fontFamily: "'Orbitron', monospace",
                                fontSize: '0.8rem',
                                color: '#00ffff',
                                background: 'rgba(0,255,255,0.1)',
                                border: '1px solid rgba(0,255,255,0.4)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                            }}
                        >
                            RETRY
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
