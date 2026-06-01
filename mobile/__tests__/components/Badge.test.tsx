import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../../src/components/common/Badge';

describe('Badge', () => {
  it('renders label text', () => {
    const { getByText } = render(<Badge label="High Chance" variant="success" />);
    expect(getByText('High Chance')).toBeTruthy();
  });

  it('renders neutral variant by default', () => {
    const { getByText } = render(<Badge label="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });

  it('renders all variants without crashing', () => {
    const variants = ['success', 'warning', 'danger', 'info', 'neutral'] as const;
    variants.forEach((v) => {
      const { getByText } = render(<Badge label={v} variant={v} />);
      expect(getByText(v)).toBeTruthy();
    });
  });
});
