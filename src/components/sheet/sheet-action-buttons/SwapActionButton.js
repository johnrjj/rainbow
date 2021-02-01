import React, { useCallback } from 'react';
import { useExpandedStateNavigation } from '../../../hooks';
import SheetActionButton from './SheetActionButton';
import Routes from '@rainbow-me/routes';

export default function SwapActionButton({
  color: givenColor,
  inputType,
  label,
  weight = 'bold',
  ...props
}) {
  const { colors } = useTheme();
  const color = givenColor || colors.swapPurple;
  const navigate = useExpandedStateNavigation(inputType);
  const handlePress = useCallback(
    () =>
      navigate(Routes.EXCHANGE_MODAL, params => ({
        params: {
          params,
          screen: Routes.MAIN_EXCHANGE_SCREEN,
        },
        screen: Routes.MAIN_EXCHANGE_NAVIGATOR,
      })),
    [navigate]
  );

  return (
    <SheetActionButton
      {...props}
      color={color}
      label={label || '􀖅 Swap'}
      onPress={handlePress}
      testID="swap"
      weight={weight}
    />
  );
}
