import { Position, UseMentionsConfig } from '@mention-types';
import {
  defaultTriggerTextStyle,
  emptyObject,
  generateValueFromMentionStateAndChangedText,
  getConfigsArray,
  getTriggerPartSuggestionKeywords,
  parseValue,
} from '@mention-utils';
import React, { useMemo, useState } from 'react';
import { NativeSyntheticEvent, Text, TextInputSelectionChangeEventData } from 'react-native';

/**
 * Hook that stores mention context.
 */
const useMentions = <TriggerName extends string>({
  value,
  onChange,

  triggersConfig = emptyObject,
  patternsConfig = emptyObject,

  onSelectionChange,
}: UseMentionsConfig<TriggerName>) => {
  const [selection, setSelection] = useState<Position>({
    start: 0,
    end: 0,
  });

  const mentionState = useMemo(() => {
    return parseValue(value, getConfigsArray(triggersConfig, patternsConfig));
  }, [value, triggersConfig, patternsConfig]);

  const handleTextChange = (text: string) => {
    const nextValue = generateValueFromMentionStateAndChangedText(mentionState, text);
    onChange(nextValue);
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const newSelection = event.nativeEvent.selection;
    setSelection(newSelection);
    onSelectionChange?.(newSelection);
  };

  const triggers = useMemo(() => {
    return getTriggerPartSuggestionKeywords<TriggerName>(
      mentionState,
      selection,
      triggersConfig,
      onChange,
    );
  }, [mentionState, selection, triggersConfig, onChange]);

  const textInputProps = {
    onChangeText: handleTextChange,
    onSelectionChange: handleSelectionChange,
    children: React.createElement(
      Text,
      null,
      mentionState.parts.map(({ text, config, data }, index) => {
        console.log('=> part', { text, config, data });

        let displayText = text;
        let style = defaultTriggerTextStyle;

        if (!config || !data) {
          // Fallback parse mention for text like @[Name](id:xxx color:yyy)
          const regex = /@\[([^\]]+)\]\(id:[^)]+(?: color:(#[A-Fa-f0-9]{6}))?\)/;
          const match = regex.exec(text);

          if (match) {
            const name = match[1];
            const color = match[2] ?? '#000000';
            displayText = `@${name}`;
            style = {
              color: color,
              fontWeight: 'bold',
            };
            console.log('=> fallback style', style);
          } else {
            // Plain text
            return React.createElement(Text, { key: index }, text);
          }
        } else {
          // Mention with full data
          style =
            typeof config?.textStyle === 'function'
              ? config.textStyle(data)
              : {
                  ...(typeof config?.textStyle === 'object' ? config.textStyle : {}),
                  ...(data && 'color' in data ? { color: (data as any).color } : {}),
                };
          displayText = `@${(data as any)?.name || displayText}`;
          console.log('=> config style', style);
        }

        console.log('=> final style', style);
        return React.createElement(
          Text,
          {
            key: `${index}-${data?.trigger ?? 'plain'}`,
            style,
          },
          displayText,
        );
      }),
    ),
  };

  return {
    triggers,
    textInputProps,
    mentionState,
  };
};

export { useMentions };
