"use client";

import React from "react";

import { captureException } from "@/lib/error-tracking/client";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureException(error, {
      source: "react_error_boundary",
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: "20px",
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
              color: "#721c24",
            }}
          >
            <h2>Something went wrong</h2>
            <p>We&apos;ve logged this error and will look into it.</p>
            {this.state.error && (
              <details style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
                {this.state.error.toString()}
              </details>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}
