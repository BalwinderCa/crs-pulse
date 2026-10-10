import React from 'react';
import { render } from '@testing-library/react-native';
import { toastConfig } from '../../src/components/common/AppToast';

describe('toastConfig', () => {
  it.each(['success', 'error', 'info'] as const)('renders a %s toast with both lines', (kind) => {
    const renderToast = toastConfig[kind]!;
    const { getByText } = render(
      <>{renderToast({ text1: 'All data reset.', text2: 'Details' } as Parameters<typeof renderToast>[0])}</>,
    );
    expect(getByText('All data reset.')).toBeTruthy();
    expect(getByText('Details')).toBeTruthy();
  });

  it('omits the second line when there is none', () => {
    const renderToast = toastConfig.success!;
    const { queryByText } = render(
      <>{renderToast({ text1: 'Saved' } as Parameters<typeof renderToast>[0])}</>,
    );
    expect(queryByText('Saved')).toBeTruthy();
    expect(queryByText('Details')).toBeNull();
  });
});
