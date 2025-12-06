import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { QuickExpenseWidget } from './QuickExpense';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const nameToWidget: Record<string, React.ComponentType> = {
  QuickExpense: QuickExpenseWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];

  switch (props.widgetAction) {
    case 'WIDGET_RESIZED':
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
      props.renderWidget(<Widget />);
      break;

    case 'WIDGET_DELETED':
      break;

    case 'WIDGET_CLICK':
      const action = props.clickActionData?.action;
      if (action === 'voice' || action === 'camera') {
        await AsyncStorage.setItem('widget_action', action);
        Linking.openURL('xpense://');
      }
      break;

    default:
      break;
  }
}
