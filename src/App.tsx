import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ItemsProvider } from './context/ItemsContext';
import { PetsProvider } from './context/PetsContext';
import { UserDataProvider } from './context/UserDataContext';
import { Navbar, MobileBottomNav, NavTab } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { UsernameModal } from './components/UsernameModal';
import { ReportModal } from './components/ReportModal';
import { StartupSplashScreen } from './components/StartupSplashScreen';
import { HomeView } from './views/HomeView';
import { ValueListView } from './views/ValueListView';
import { TradeCalculatorView } from './views/TradeCalculatorView';
import { TradeFeedView } from './views/TradeFeedView';
import { ItemDetailView } from './views/ItemDetailView';
import { FavoritesView } from './views/FavoritesView';
import { TradeHistoryView } from './views/TradeHistoryView';
import { WorldChatView } from './views/WorldChatView';
import { FriendsView } from './views/FriendsView';
import { PrivateChatView } from './views/PrivateChatView';
import { SettingsView } from './views/SettingsView';
import { AdminPanelView } from './views/AdminPanelView';
import { TradeItemSlot, SkyblockItem, UserRole } from './types';
import { BanNoticeModal } from './components/BanNoticeModal';
import { parseCoinStringToNumber } from './lib/itemHelpers';
import { formatCoins } from './lib/formatters';

function AppContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [navHistory, setNavHistory] = useState<NavTab[]>(['home']);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Handle splash completion and routing based on authentication state
  const handleSplashFinish = () => {
    setShowSplash(false);
    // If user is signed out -> continue to existing Sign In screen
    // If user is signed in -> continue to existing Home screen
    if (!currentUser) {
      setAuthModalOpen(true);
    }
  };

  // Trade calculator state maintained globally so users can add items from Value List or History
  const [yourOffer, setYourOffer] = useState<TradeItemSlot[]>([]);
  const [theirOffer, setTheirOffer] = useState<TradeItemSlot[]>([]);

  // Private chat target state
  const [privateChatTarget, setPrivateChatTarget] = useState<{
    friendshipId: string;
    partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string; role?: UserRole };
  } | null>(null);

  // Report modal state
  const [reportState, setReportState] = useState<{
    isOpen: boolean;
    targetType: 'user' | 'world_message' | 'private_message' | 'trade_post';
    targetId: string;
    targetUsername?: string;
  }>({
    isOpen: false,
    targetType: 'user',
    targetId: '',
  });

  const navigateTo = (tab: NavTab) => {
    setPrivateChatTarget(null);
    if (tab === currentTab) return;
    setNavHistory((prev) => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    setCurrentTab(tab);
  };

  const handleGoBack = () => {
    if (privateChatTarget) {
      setPrivateChatTarget(null);
      return;
    }
    setNavHistory((prev) => {
      if (prev.length <= 1) {
        setCurrentTab('home');
        return ['home'];
      }
      const nextHistory = prev.slice(0, prev.length - 1);
      const previousTab = nextHistory[nextHistory.length - 1] || 'home';
      setCurrentTab(previousTab);
      return nextHistory;
    });
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    navigateTo('itemdetail');
  };

  const handleAddToTradeOffer = (
    item: SkyblockItem, 
    side: 'your' | 'their', 
    variant?: 'normal' | 'rare' | '4/4' | '5/5' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | string
  ) => {
    const target = side === 'your' ? yourOffer : theirOffer;
    const setTarget = side === 'your' ? setYourOffer : setTheirOffer;
    const isSword = item.category === 'Sword';
    const isPet = item.category === 'Pet';
    const isAccessory = item.category === 'Accessories / Items' || (item.category as string) === 'accessories_items';
    const chosenVariant = variant || (isPet ? 'P5' : isSword ? 'normal' : isAccessory ? 'standard' : '4/4');

    let unitVal = item.value || 0;
    let displayVal = item.displayValue || item.normalValue || (item.value ? formatCoins(item.value) : 'Value Pending');

    if (isPet) {
      const tierKey = chosenVariant.toLowerCase() as 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10';
      const petObj = item.petData;
      if (petObj && (petObj as any)[tierKey]) {
        displayVal = (petObj as any)[tierKey];
        unitVal = parseCoinStringToNumber(displayVal);
      } else {
        displayVal = (item as any)[tierKey] || item.value.toString();
        unitVal = parseCoinStringToNumber(displayVal);
      }
    } else if (isSword) {
      unitVal = chosenVariant === 'rare' 
        ? (item.numericRareValue || item.value) 
        : item.value;
      displayVal = chosenVariant === 'rare' 
        ? (item.rareValue || '') 
        : (item.normalValue || '');
    } else if (isAccessory) {
      unitVal = item.value || 0;
      displayVal = item.displayValue || item.normalValue || (item.value ? formatCoins(item.value) : 'Value Pending');
    } else {
      unitVal = chosenVariant === '5/5' 
        ? (item.numericFivePieceValue || item.value) 
        : item.value;
      displayVal = chosenVariant === '5/5' 
        ? (item.fivePieceValue || '') 
        : (item.fourPieceValue || '');
    }

    const existing = target.findIndex((s) => s.item.id === item.id && s.variant === chosenVariant);

    if (existing >= 0) {
      const updated = [...target];
      updated[existing].quantity += 1;
      setTarget(updated);
    } else {
      setTarget([
        ...target, 
        { 
          item, 
          quantity: 1, 
          variant: chosenVariant,
          unitValue: unitVal,
          selectedDisplayValue: displayVal,
          petData: item.petData,
        }
      ]);
    }
    // Switch to calculator tab to view addition
    setCurrentTab('calculator');
  };

  const handleLoadTradeIntoCalculator = (your: TradeItemSlot[], their: TradeItemSlot[]) => {
    setYourOffer(your);
    setTheirOffer(their);
    setCurrentTab('calculator');
  };

  const handleOpenPrivateChat = (
    friendshipId: string,
    partnerProfile: { uid: string; username: string; name?: string; avatarUrl?: string }
  ) => {
    setPrivateChatTarget({ friendshipId, partnerProfile });
  };

  const handleOpenReportModal = (
    targetType: 'user' | 'world_message' | 'private_message' | 'trade_post',
    targetId: string,
    targetUsername?: string
  ) => {
    setReportState({
      isOpen: true,
      targetType,
      targetId,
      targetUsername,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      {/* Startup Intro / Splash Screen */}
      {showSplash && (
        <StartupSplashScreen
          isReady={!authLoading}
          onFinish={handleSplashFinish}
        />
      )}

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onTabChange={navigateTo}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

            {/* Main Application Content Container */}
            <main className={`flex-1 w-full mx-auto ${
              currentTab === 'worldchat' && !privateChatTarget
                ? 'p-0 max-w-none flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] overflow-hidden'
                : 'max-w-7xl px-4 sm:px-6 pt-6 pb-24 md:pb-12'
            }`}>
              {privateChatTarget ? (
                <PrivateChatView
                  friendshipId={privateChatTarget.friendshipId}
                  partnerProfile={privateChatTarget.partnerProfile}
                  onBack={handleGoBack}
                  onOpenReportModal={handleOpenReportModal}
                />
              ) : (
                <>
                  {currentTab === 'home' && (
                    <HomeView
                      onNavigate={navigateTo}
                      onSelectItem={handleSelectItem}
                      onOpenAuth={() => setAuthModalOpen(true)}
                    />
                  )}

                  {currentTab === 'valuelist' && (
                    <ValueListView
                      onSelectItem={handleSelectItem}
                      onAddToTradeOffer={handleAddToTradeOffer}
                    />
                  )}

                  {currentTab === 'tradefeed' && (
                    <TradeFeedView
                      onOpenCalculator={() => navigateTo('calculator')}
                      onOpenPrivateChat={handleOpenPrivateChat}
                      onOpenReportModal={(type, targetId, username) => handleOpenReportModal(type, targetId, username)}
                      onOpenAuth={() => setAuthModalOpen(true)}
                      onSelectItem={handleSelectItem}
                      onNavigateToSettings={() => navigateTo('settings')}
                    />
                  )}

                  {currentTab === 'calculator' && (
                    <TradeCalculatorView
                      yourOffer={yourOffer}
                      theirOffer={theirOffer}
                      setYourOffer={setYourOffer}
                      setTheirOffer={setTheirOffer}
                      onOpenAuth={() => setAuthModalOpen(true)}
                      onPostSuccess={() => navigateTo('tradefeed')}
                      onBack={navHistory.length > 1 ? handleGoBack : undefined}
                    />
                  )}

                  {currentTab === 'itemdetail' && selectedItemId && (
                    <ItemDetailView
                      itemId={selectedItemId}
                      onBack={handleGoBack}
                      onAddToTradeOffer={handleAddToTradeOffer}
                    />
                  )}

                  {currentTab === 'favorites' && (
                    <FavoritesView
                      onSelectItem={handleSelectItem}
                      onAddToTradeOffer={handleAddToTradeOffer}
                      onExplore={() => navigateTo('valuelist')}
                      onBack={navHistory.length > 1 ? handleGoBack : undefined}
                    />
                  )}

                  {currentTab === 'history' && (
                    <TradeHistoryView
                      onLoadTradeIntoCalculator={handleLoadTradeIntoCalculator}
                      onOpenCalculator={() => navigateTo('calculator')}
                      onBack={navHistory.length > 1 ? handleGoBack : undefined}
                    />
                  )}

                  {currentTab === 'worldchat' && (
                    <WorldChatView
                      onOpenAuth={() => setAuthModalOpen(true)}
                      onOpenReportModal={handleOpenReportModal}
                    />
                  )}

                  {currentTab === 'friends' && (
                    <FriendsView
                      onOpenAuth={() => setAuthModalOpen(true)}
                      onOpenPrivateChat={handleOpenPrivateChat}
                      onBack={navHistory.length > 1 ? handleGoBack : undefined}
                    />
                  )}

                  {currentTab === 'settings' && (
                    <SettingsView
                      onOpenAuth={() => setAuthModalOpen(true)}
                      onOpenAdminPanel={() => navigateTo('admin')}
                      onBack={navHistory.length > 1 ? handleGoBack : undefined}
                    />
                  )}

                  {currentTab === 'admin' && (
                    <AdminPanelView onBack={handleGoBack} />
                  )}
                </>
              )}
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav
              currentTab={currentTab}
              onTabChange={navigateTo}
              onOpenAuth={() => setAuthModalOpen(true)}
            />

            {/* Global Modals */}
            <AuthModal
              isOpen={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
            />

            <UsernameModal />

            <BanNoticeModal />

            <ReportModal
              isOpen={reportState.isOpen}
              onClose={() => setReportState((prev) => ({ ...prev, isOpen: false }))}
              targetType={reportState.targetType}
              targetId={reportState.targetId}
              targetUsername={reportState.targetUsername}
            />
          </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ItemsProvider>
        <PetsProvider>
          <UserDataProvider>
            <AppContent />
          </UserDataProvider>
        </PetsProvider>
      </ItemsProvider>
    </AuthProvider>
  );
}
