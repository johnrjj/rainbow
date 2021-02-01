import { sortBy, toLower } from 'lodash';
import React, { Fragment, useCallback, useMemo, useRef } from 'react';
import { Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { ButtonPressAnimation } from '../animations';
import { UnderlyingAssetCoinRow } from '../coin-row';
import { initialChartExpandedStateSheetHeight } from '../expanded-state/ChartExpandedState';
import { Column, Row } from '../layout';
import {
  BuyActionButton,
  SheetActionButtonRow,
  SheetDivider,
  SlackSheet,
  SwapActionButton,
} from '../sheet';
import { Text } from '../text';
import { Chart } from '../value-chart';
import { ChartPathProvider } from '@rainbow-me/animated-charts';
import AssetInputTypes from '@rainbow-me/helpers/assetInputTypes';
import {
  useAccountSettings,
  useChartThrottledPoints,
  useDimensions,
  useDPI,
} from '@rainbow-me/hooks';
import { useNavigation } from '@rainbow-me/navigation';
import Routes from '@rainbow-me/routes';
import { position } from '@rainbow-me/styles';
import {
  convertRawAmountToNativeDisplay,
  divide,
  handleSignificantDecimals,
  multiply,
} from '@rainbow-me/utilities';
import ShadowStack from 'react-native-shadow-stack';

const formatItem = (
  { address, name, price, symbol, color },
  nativeCurrencySymbol
) => {
  const change = `${parseFloat(
    (price.relative_change_24h || 0).toFixed(2)
  )}%`.replace('-', '');

  const value = `${nativeCurrencySymbol}${handleSignificantDecimals(
    price.value,
    2
  )} `;

  return {
    address,
    change,
    color,
    isPositive: price.relative_change_24h > 0,
    name,
    price: value,
    symbol,
  };
};

// add status bar height for Android
const heightWithoutChart = 309 + (android && 24);
const heightWithChart = Dimensions.get('window').height - 80;

export const initialTokenIndexExpandedStateSheetHeight =
  heightWithChart + (android && 40);

const formatGenericAsset = asset => {
  if (asset?.price?.value) {
    return {
      ...asset,
      native: { price: { amount: asset?.price?.value } },
    };
  }
  return asset;
};

export default function TokenIndexExpandedState({ asset }) {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const { genericAssets } = useSelector(({ data: { genericAssets } }) => ({
    genericAssets,
  }));
  const { nativeCurrency, nativeCurrencySymbol } = useAccountSettings();

  const dpi = useDPI();

  const underlying = useMemo(() => {
    if (!dpi) return [];
    const baseAsset = formatGenericAsset(
      genericAssets[toLower(dpi?.base?.address)]
    );

    const underlyingAssets = dpi?.underlying.map(asset => {
      const genericAsset = genericAssets[toLower(asset?.address)];
      if (!genericAsset) return null;
      const assetWithPrice = formatGenericAsset(genericAsset);

      const {
        display: pricePerUnitFormatted,
        amount: pricePerUnit,
      } = convertRawAmountToNativeDisplay(
        asset.amount,
        asset.decimals,
        assetWithPrice?.price?.value || 0,
        nativeCurrency
      );

      const percentageAllocation = Number(
        divide(multiply(pricePerUnit, 100), baseAsset.price.value)
      );

      return {
        ...formatItem(assetWithPrice, nativeCurrencySymbol),
        color: assetWithPrice.color,
        percentageAllocation,
        pricePerUnitFormatted,
      };
    });
    return sortBy(
      underlyingAssets.filter(asset => asset !== null),
      'percentageAllocation'
    ).reverse();
  }, [dpi, genericAssets, nativeCurrency, nativeCurrencySymbol]);

  // If we don't have a balance for this asset
  // It's a generic asset
  const assetWithPrice = formatGenericAsset(genericAssets[asset?.address]);

  const {
    chart,
    chartData,
    chartType,
    color,
    fetchingCharts,
    initialChartDataLabels,
    showChart,
    throttledData,
  } = useChartThrottledPoints({
    asset: assetWithPrice,
    heightWithChart: heightWithChart - (!asset?.balance && 68),
    heightWithoutChart: heightWithoutChart - (!asset?.balance && 68),
  });

  const needsEth = asset?.address === 'eth' && asset?.balance?.amount === '0';

  const duration = useRef(0);

  if (duration.current === 0) {
    duration.current = 300;
  }
  const { height: screenHeight } = useDimensions();

  const handlePress = useCallback(
    item => {
      navigate(
        ios ? Routes.EXPANDED_ASSET_SHEET : Routes.EXPANDED_ASSET_SCREEN,
        {
          asset: item,
          longFormHeight: initialChartExpandedStateSheetHeight,
          type: 'token',
        }
      );
    },
    [navigate]
  );

  return (
    <Fragment>
      <SlackSheet
        bottomInset={42}
        {...(ios
          ? { height: '100%' }
          : { additionalTopPadding: true, contentHeight: screenHeight - 80 })}
      >
        <ChartPathProvider data={throttledData}>
          <Chart
            {...chartData}
            {...initialChartDataLabels}
            asset={assetWithPrice}
            chart={chart}
            chartType={chartType}
            color={color}
            fetchingCharts={fetchingCharts}
            nativePoints={chart}
            showChart={showChart}
            throttledData={throttledData}
          />
        </ChartPathProvider>
        <SheetDivider />
        {needsEth ? (
          <SheetActionButtonRow>
            <BuyActionButton color={color} fullWidth />
          </SheetActionButtonRow>
        ) : (
          <SheetActionButtonRow>
            <Column marginTop={5}>
              <SwapActionButton
                color={color}
                inputType={AssetInputTypes.out}
                label={`􀖅 Get ${asset?.symbol}`}
                weight="heavy"
              />
            </Column>
          </SheetActionButtonRow>
        )}
        <Row margin={19} marginBottom={0}>
          <Column align="start" flex={1}>
            <Text color={colors.alpha(colors.blueGreyDark, 0.5)}>
              Underlying Assets
            </Text>
          </Column>
          <Column align="end" flex={1}>
            <Text align="right" color={colors.alpha(colors.blueGreyDark, 0.5)}>
              Makeup of 1 {assetWithPrice.symbol}
            </Text>
          </Column>
        </Row>
        <Column margin={19}>
          {underlying.map(item => (
            <Row
              as={ButtonPressAnimation}
              key={`dpi-${item?.address}`}
              onPress={() => handlePress(item)}
            >
              <Column align="start" flex={1}>
                <UnderlyingAssetCoinRow {...item} />
              </Column>
              <Column aling="end">
                <Row key={`allocation-${item.symbol}`}>
                  <Text
                    align="right"
                    color={colors.alpha(colors.blueGreyDark, 0.5)}
                    size="large"
                  >
                    {item.pricePerUnitFormatted}
                  </Text>
                  <Column
                    align="end"
                    backgroundColor={colors.white}
                    height={30}
                    marginLeft={10}
                  >
                    <Column
                      height={16}
                      marginTop={3}
                      width={item.percentageAllocation * 2}
                    >
                      <ShadowStack
                        backgroundColor={colors.dpiPurple}
                        borderRadius={10}
                        shadows={[[0, 3, 9, item.color, 0.35]]}
                        style={{
                          height: 16,
                          width: '100%',
                        }}
                      >
                        <LinearGradient
                          borderRadius={15}
                          colors={[colors.alpha(item.color, 0.7), item.color]}
                          end={{ x: 1, y: 0.5 }}
                          overflow="hidden"
                          pointerEvents="none"
                          start={{ x: 0, y: 0.5 }}
                          style={position.coverAsObject}
                        />
                      </ShadowStack>
                    </Column>
                  </Column>
                </Row>
              </Column>
            </Row>
          ))}
        </Column>
      </SlackSheet>
    </Fragment>
  );
}
