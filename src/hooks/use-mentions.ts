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

  /**
   * State that includes current parts and plain text
   */
  const mentionState = useMemo(
    () => parseValue(value, getConfigsArray(triggersConfig, patternsConfig)),
    [value, triggersConfig, patternsConfig],
  );

  /**
   * Callback that handles TextInput text change
   */
  const handleTextChange = (text: string) => {
    onChange(generateValueFromMentionStateAndChangedText(mentionState, text));
  };

  /**
   * Callback that handles TextInput selection change
   */
  const handleSelectionChange = (event: any) => {
    const newSelection = event.nativeEvent.selection;

    setSelection(newSelection);
    onSelectionChange && onSelectionChange(newSelection);
  };

  /**
   * `TextInput` props that we can provide to the `TextInput` component.
   */
  const textInputProps = {
    onChangeText: handleTextChange,
    onSelectionChange: handleSelectionChange,
    children: React.createElement(
      'text',
      null,
      mentionState.parts.map(({ text, config, data }, index) => {
        let displayText = text;
        let style = defaultTriggerTextStyle;

        if (!config || !data) {
          // Check if text matches @[name](id:xxx color:#xxxxxx)
          const regex = /@\[(.+?)\]\(id:[^)]+(?: color:(#[0-9a-fA-F]{6}))?\)/;
          const match = regex.exec(text);

          if (match) {
            const name = match[1];
            const color = match[2] ?? '#000000';

            displayText = `@${name}`;
            style = {
              color: color,
              fontWeight: 'bold',
            };
          }
        } else {
          style =
            typeof config.textStyle === 'function'
              ? config.textStyle(data)
              : {
                  ...(typeof config.textStyle === 'object' && config.textStyle !== null
                    ? config.textStyle
                    : {}),
                  ...(data && 'color' in data ? { color: (data as any)?.color } : {}),
                };
        }

        return React.createElement(
          'text',
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
    triggers: getTriggerPartSuggestionKeywords<TriggerName>(
      mentionState,
      selection,
      triggersConfig,
      onChange,
    ),
    textInputProps,
    mentionState,
  };
};

export { useMentions };
