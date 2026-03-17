import { useEffect, useCallback } from 'react';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useFormFiller } from '@/hooks/use-form-filler';
import { useInputScanner } from '@/hooks/use-input-scanner';
import { useSearch } from '@/hooks/use-search';
import { RESUME_DATA } from '@/data/resume-data';
import { ToggleButton } from '@/components/ToggleButton';
import { SidebarPanel } from '@/components/SidebarPanel';

export function SidebarContainer() {
  const {
    isVisible,
    hideContent,
    searchKeyword,
    message,
    messageType,
    collapsedGroups,
    collapsedSubGroups,
    sidebarWidth,
    toggle,
    hide,
    setHideContent,
    setSearchKeyword,
    toggleGroup,
    toggleSubGroup,
    setSidebarWidth,
  } = useSidebarStore();

  const { currentInputRef, trackFocusedInput, fill } = useFormFiller();
  const { jumpNext } = useInputScanner();
  const filteredGroups = useSearch(RESUME_DATA, searchKeyword);

  useEffect(() => {
    document.addEventListener('focusin', trackFocusedInput);
    return () => document.removeEventListener('focusin', trackFocusedInput);
  }, [trackFocusedInput]);

  useEffect(() => {
    const handler = (
      req: { action: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (resp: { ok: boolean }) => void,
    ) => {
      if (req.action === 'toggleSidebar') {
        toggle();
        sendResponse({ ok: true });
      }
      return true;
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [toggle]);

  const handleJumpNext = useCallback(() => {
    const next = jumpNext(currentInputRef.current);
    if (next) {
      currentInputRef.current = next;
    }
  }, [jumpNext, currentInputRef]);

  const handleTogglePrivacy = useCallback(() => {
    setHideContent(!hideContent);
  }, [hideContent, setHideContent]);

  return (
    <>
      {!isVisible && <ToggleButton isOpen={isVisible} onClick={toggle} />}
      <SidebarPanel
        isVisible={isVisible}
        hideContent={hideContent}
        searchKeyword={searchKeyword}
        message={message}
        messageType={messageType}
        groups={filteredGroups}
        collapsedGroups={collapsedGroups}
        collapsedSubGroups={collapsedSubGroups}
        width={sidebarWidth}
        onSearch={setSearchKeyword}
        onTogglePrivacy={handleTogglePrivacy}
        onJumpNext={handleJumpNext}
        onClose={hide}
        onToggleGroup={toggleGroup}
        onToggleSubGroup={toggleSubGroup}
        onFill={fill}
        onWidthChange={setSidebarWidth}
      />
    </>
  );
}
