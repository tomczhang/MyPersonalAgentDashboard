"use client";
import { useEffect, useState } from 'react';
import { RiMoonLine, RiSunLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('boardui:theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('boardui:theme', dark ? 'dark' : 'light'); } catch { /* Theme works without persistence. */ }
  }, [dark]);
  return <Button variant="secondary" leadingIcon={dark ? RiSunLine : RiMoonLine} onClick={() => setDark(!dark)} aria-label="切换深浅主题" aria-pressed={dark}>{dark ? '浅色模式' : '深色模式'}</Button>;
}
