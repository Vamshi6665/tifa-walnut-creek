'use client';

import { Component } from 'react';

/**
 * Keeps a failing WebGL scene (bad photo, lost GPU context, old browser) from
 * taking the rest of the page down with it. Renders `fallback` instead.
 */
export default class SafeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
    if (typeof console !== 'undefined') console.warn('[tifa] scene disabled:', error?.message ?? error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
