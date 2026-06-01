import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../../src/components/common/EmptyState';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('EmptyState', () => {
  it('renders title and description', () => {
    const { getByText } = render(
      <EmptyState title="No draws" description="Try again later" />,
    );
    expect(getByText('No draws')).toBeTruthy();
    expect(getByText('Try again later')).toBeTruthy();
  });

  it('renders action button when actionLabel + onAction provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Empty" actionLabel="Retry" onAction={onAction} />,
    );
    fireEvent.press(getByText('Retry'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render button when no actionLabel', () => {
    const { queryByRole } = render(<EmptyState title="Empty" />);
    expect(queryByRole('button')).toBeNull();
  });
});
