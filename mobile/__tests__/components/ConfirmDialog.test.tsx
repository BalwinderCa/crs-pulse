import React from 'react';
import { Modal, Pressable } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ConfirmDialog } from '../../src/components/common/ConfirmDialog';

function setup(onConfirm: () => void | Promise<void> = () => {}) {
  const onCancel = jest.fn();
  const utils = render(
    <ConfirmDialog
      visible
      destructive
      phLabel="test-reset"
      title="Reset All Data"
      message="This cannot be undone."
      confirmLabel="Reset Everything"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  const back = () => utils.UNSAFE_getByType(Modal).props.onRequestClose();
  const pressCancelPaths = () => {
    fireEvent.press(utils.getByText('Cancel'));
    fireEvent.press(utils.UNSAFE_getAllByType(Pressable)[0]!); // backdrop
    act(() => back());
  };
  return { ...utils, onCancel, back, pressCancelPaths };
}

describe('ConfirmDialog', () => {
  // TouchableOpacity's press animation otherwise ticks outside act().
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders the title, message and both actions', () => {
    const { getByText } = setup();
    expect(getByText('Reset All Data')).toBeTruthy();
    expect(getByText('This cannot be undone.')).toBeTruthy();
    expect(getByText('Reset Everything')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('labels the buttons for analytics from phLabel', () => {
    const { UNSAFE_getAllByProps } = setup();
    expect(UNSAFE_getAllByProps({ 'ph-label': 'test-reset-confirm', title: 'Reset Everything' })).toHaveLength(1);
    expect(UNSAFE_getAllByProps({ 'ph-label': 'test-reset-cancel', title: 'Cancel' })).toHaveLength(1);
  });

  it('cancels from the Cancel button, the backdrop and Android back', () => {
    const { pressCancelPaths, onCancel } = setup();
    pressCancelPaths();
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it('ignores every cancel path while the confirm action is running', async () => {
    let finish!: () => void;
    const onConfirm = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { getByLabelText, pressCancelPaths, back, onCancel } = setup(onConfirm);

    fireEvent.press(getByLabelText('Reset Everything'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    pressCancelPaths();
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => { finish(); });
    act(() => back());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('becomes cancellable again when the confirm action throws', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('boom'));
    const { getByLabelText, back, onCancel } = setup(() => onConfirm().catch(() => {}));
    await act(async () => { fireEvent.press(getByLabelText('Reset Everything')); });
    act(() => back());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
