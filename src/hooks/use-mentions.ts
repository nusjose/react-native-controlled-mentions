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
 *
 * @param value
 * @param onChange
 * @param triggersConfig
 * @param patterns
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

  /**
   * State that includes current parts and plain text
   */
  const mentionState = useMemo(
    () => parseValue(value, getConfigsArray(triggersConfig, patternsConfig)),
    [value, triggersConfig, patternsConfig],
  );

  /**
   * Callback that handles TextInput text change
   *
   * @param text
   */
  const handleTextChange = (text: string) => {
    onChange(generateValueFromMentionStateAndChangedText(mentionState, text));
  };

  /**
   * Callback that handles TextInput selection change
   *
   * @param event
   */
  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const newSelection = event.nativeEvent.selection;

    setSelection(newSelection);
    onSelectionChange && onSelectionChange(newSelection);
  };

  /**
   * Object with triggers and their current keyword state depending on current text and selection
   */
  const triggers = useMemo(
    () =>
      getTriggerPartSuggestionKeywords<TriggerName>(
        mentionState,
        selection,
        triggersConfig,
        onChange,
      ),
    [mentionState, selection, triggersConfig, onChange],
  );

  /**
   * `TextInput` props that we can provide to the `TextInput` component.
   */
  const textInputProps = {
    onChangeText: handleTextChange,
    onSelectionChange: handleSelectionChange,
    children: React.createElement(
      Text,
      null,
      mentionState.parts.map(({ text, config, data }, index) => {
        console.log({ text, config, data });

        let displayText = text;
        let style = defaultTriggerTextStyle;

        if (!config || !data) {
          const regex = /@\[([^\]]+)\]\(id:[^)]+(?: color:([^)]+))?\)/g;
          let lastIndex = 0;
          const elements: React.ReactNode[] = [];

          let match: RegExpExecArray | null;
          while ((match = regex.exec(text)) !== null) {
            const beforeText = text.slice(lastIndex, match.index);
            if (beforeText) {
              elements.push(
                React.createElement(Text, { key: `${index}-before-${lastIndex}` }, beforeText),
              );
            }

            const name = match[1];
            const color = match[2] ?? '#000000';

            elements.push(
              React.createElement(
                Text,
                {
                  key: `${index}-mention-${lastIndex}`,
                  style: { color, fontWeight: 'bold' },
                },
                `@${name}`,
              ),
            );

            lastIndex = match.index + match[0].length;
          }

          const afterText = text.slice(lastIndex);
          if (afterText) {
            elements.push(
              React.createElement(Text, { key: `${index}-after-${lastIndex}` }, afterText),
            );
          }

          return React.createElement(React.Fragment, { key: index }, elements);
        }

        style =
          typeof config.textStyle === 'function'
            ? config.textStyle(data)
            : {
                ...(typeof config.textStyle === 'object' && config.textStyle !== null
                  ? config.textStyle
                  : {}),
                ...(data && 'color' in data ? { color: (data as any).color } : {}),
              };

        return React.createElement(
          Text,
          {
            key: `${index}-${data?.trigger ?? 'pattern'}`,
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
