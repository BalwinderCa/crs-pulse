import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/common/Button';

describe('Button', () => {
  it('renders title', () => {
    const { getByText } = render(<Button title="Sign In" onPress={() => {}} />);
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button title="Tap" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button title="Loading" onPress={onPress} loading />);
    const btn = getByRole('button');
    expect(btn.props.accessibilityState.busy).toBe(true);
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button title="Disabled" onPress={onPress} disabled />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
