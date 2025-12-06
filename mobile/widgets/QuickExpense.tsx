import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function QuickExpenseWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 12,
      }}
    >
      <FlexWidget
        clickAction="VOICE"
        clickActionData={{ action: 'voice' }}
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#3b82f6',
          borderRadius: 12,
          marginRight: 6,
        }}
      >
        <TextWidget
          text="🎤"
          style={{
            fontSize: 28,
          }}
        />
        <TextWidget
          text="Voice"
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: '#ffffff',
            marginTop: 4,
          }}
        />
      </FlexWidget>

      <FlexWidget
        clickAction="CAMERA"
        clickActionData={{ action: 'camera' }}
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#10b981',
          borderRadius: 12,
          marginLeft: 6,
        }}
      >
        <TextWidget
          text="📷"
          style={{
            fontSize: 28,
          }}
        />
        <TextWidget
          text="Receipt"
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: '#ffffff',
            marginTop: 4,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
