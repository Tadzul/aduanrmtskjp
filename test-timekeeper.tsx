import React, { useState } from 'react';
import TimeKeeper from 'react-timekeeper';
import { createRoot } from 'react-dom/client';

export default function Test() {
  const [time, setTime] = useState('12:34');
  return <TimeKeeper time={time} onChange={(data) => setTime(data.formatted24)} />
}
