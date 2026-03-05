import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePeople, ConversationItem } from '@auxwall/messenger';
import { getApiUrl, getFeathersClient } from '../utility/feathersClient';
import { getStorage } from '../components/Storage';
import color from '../utility/color';

export default function ShareScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const sharedFile = route.params?.sharedFile;

  const [chats, setChats] = useState([]);
  const [activeTab, setActiveTab] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ apiBaseUrl: '', accessToken: '', companyId: '', theme: {} });
  const [currentUser, setCurrentUser] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
      const init = async () => {
          try {
              const [apiBaseUrl, accessToken, companyId, userStr] = await Promise.all([
                  getApiUrl(),
                  getStorage("accessToken"),
                  getStorage("companyId"),
                  getStorage("appUser")
              ]);
              setConfig({ apiBaseUrl, accessToken, companyId, theme: { primaryColor: color.primary } });
              setCurrentUser(userStr ? JSON.parse(userStr) : null);
              setClient(await getFeathersClient());
          } catch (e) {
              console.log("Config load error", e);
          }
      };
      init();
  }, []);

  const { members, staff, loading: peopleLoading } = usePeople({ 
      apiBaseUrl: config.apiBaseUrl, 
      companyId: config.companyId, 
      accessToken: config.accessToken, 
      search: activeTab !== 'recent' ? searchQuery : '' 
  });

  useEffect(() => {
      if (config.companyId && client) {
          fetchChats();
      }
  }, [config.companyId, client]);

  const fetchChats = async () => {
      setLoading(true);
      try {
          const response = await client.service('api/conversations').find({
              query: {
                  companyId: config.companyId,
                  $sort: { updatedAt: -1 },
                  $limit: 50
              }
          });
          setChats(response.data || response || []);
      } catch (error) {
          console.log("Error fetching chats for share", error);
      } finally {
          setLoading(false);
      }
  };
  
  const formatConversationTitle = (chat, userId) => {
      if (!chat) return '';
      if (chat.name && chat.type === 'group') return chat.name;
      if (chat.participants) {
          const otherParticipant = chat.participants.find(p => String(p.userId) !== String(userId));
          if (otherParticipant) return otherParticipant.fullName || otherParticipant.name || 'Unknown User';
      }
      return chat.name || 'Chat';
  };

  const filteredChats = chats.filter(chat => {
      if (!currentUser) return false;
      const title = formatConversationTitle(chat, currentUser.id);
      return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getTabContent = () => {
      if (activeTab === 'recent') return filteredChats;
      if (activeTab === 'members') return members;
      if (activeTab === 'staff') return staff;
      if (activeTab === 'groups') return chats.filter(c => c.type === 'group' || c.isGroup);
      return [];
  };

  const [isNavigating, setIsNavigating] = useState(false);

  const handleShareTo = (target) => {
      if (isNavigating || !currentUser) return;
      setIsNavigating(true);

      if (activeTab === 'members' || activeTab === 'staff') {
          navigation.replace("ChatDetail", { 
              id: 'pending',
              title: target.name,
              image: target.image,
              targetId: target.id,
              targetType: target.userType,
              targetName: target.name,
              sharedFile: sharedFile
          });
      } else {
          navigation.replace("ChatDetail", { 
              id: target.id,
              title: formatConversationTitle(target, currentUser.id),
              sharedFile: sharedFile
          });
      }
      setTimeout(() => setIsNavigating(false), 500);
  };

  const renderItem = ({ item }) => {
      if (!currentUser) return null;
      const isPerson = activeTab === 'members' || activeTab === 'staff';
      const conversationData = isPerson ? {
          id: item.id,
          type: 'individual',
          participants: [{ userId: item.id, fullName: item.name, imageURL: item.image, userType: item.userType }],
          lastMessageText: `Tap to share to ${item.name}`
      } : {
          ...item,
          lastMessageText: `Tap to share`
      };

      return (
          <ConversationItem 
              conversation={conversationData}
              currentUserId={currentUser.id}
              onPress={() => handleShareTo(item)}
              theme={config.theme}
          />
      );
  };

  return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
          <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={24} color={color.primary} />
                  <Text style={{color: color.primary, fontSize: 16}}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Share to...</Text>
              <View style={{ width: 75 }} /> 
          </View>

          <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#888" style={{ marginRight: 10 }} />
              <TextInput 
                  style={styles.searchInput}
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#aaa"
              />
              {(searchQuery.length > 0) && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#ccc" />
                  </TouchableOpacity>
              )}
          </View>

          <View style={styles.tabContainer}>
              {['recent', 'members', 'staff', 'groups'].map(tab => (
                  <TouchableOpacity 
                      key={tab} 
                      style={[styles.tab, activeTab === tab && styles.activeTab]}
                      onPress={() => {
                          setActiveTab(tab);
                          setSearchQuery('');
                      }}
                  >
                      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                  </TouchableOpacity>
              ))}
          </View>
          
          {(loading || (peopleLoading && activeTab !== 'recent')) ? (
              <ActivityIndicator style={{marginTop: 50}} color={color.primary} />
          ) : (
              <FlatList 
                  data={getTabContent()}
                  renderItem={renderItem}
                  keyExtractor={(item, idx) => `${activeTab}-${item.id}-${idx}`}
                  contentContainerStyle={{paddingBottom: 40}}
                  ListEmptyComponent={
                      <Text style={{textAlign: 'center', marginTop: 50, color: '#888'}}>
                          No {activeTab} found
                      </Text>
                  }
              />
          )}
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    backBtn: { flexDirection: 'row', alignItems: 'center', width: 75 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        marginHorizontal: 15,
        marginVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 44,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: 'white',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: color.primary,
    },
    tabText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: color.primary,
        fontWeight: 'bold',
    }
});
