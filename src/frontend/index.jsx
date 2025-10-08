import React from 'react';
import { render, Text, Heading, Code, Table, Head, Row, Cell } from '@forge/react';

const App = () => {
  return (
    <>
      <Heading size="medium">🚀 TestPlan Builder</Heading>
      <Text>
        This panel runs automation to add Automated Tests to a Test Plan using Xray.
      </Text>

      <Text>
        <strong>Status:</strong> <Code>Panel loaded successfully</Code>
      </Text>

      <Text>
        Check Forge logs for backend execution details.
      </Text>
    </>
  );
};

export const run = render(<App />);