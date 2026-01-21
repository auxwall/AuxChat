import React, { useEffect, useState } from 'react';
import {  View,  Text,  StyleSheet,  FlatList,  TextInput,  TouchableOpacity,  ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import color from '../utility/color';
import { usePeople } from '@auxwall/messenger';
import { getApiUrl } from '../utility/feathersClient';
import { getStorage } from '../components/Storage';

export default function NewChatScreen() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [filteredData, setFilteredData] = useState([]);
  const [config, setConfig] = useState({ apiBaseUrl: '', accessToken: '' });
  const navigation = useNavigation();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [apiBaseUrl, accessToken, companyId] = await Promise.all([
          getApiUrl(),
          getStorage("accessToken"),
          getStorage("companyId")
        ]);
        setConfig({ 
          apiBaseUrl: apiBaseUrl || '', 
          accessToken: accessToken || '',
          companyId: companyId || ''
        });
      } catch (e) {
        console.log("Config load error", e);
      }
    };
    loadConfig();
  }, []);

  const { members, staff, loading } = usePeople({
    apiBaseUrl: config.apiBaseUrl,
    accessToken: config.accessToken,
    companyId: config.companyId,
    search: search
  });

  useEffect(() => {
    const currentData = activeTab === 'members' ? members : staff;
    if (!search) {
      setFilteredData(currentData);
    } else {
      const lowerSearch = search.toLowerCase();
      setFilteredData(currentData.filter((item) => 
        item.name.toLowerCase().includes(lowerSearch)
      ));
    }
  }, [search, members, staff, activeTab]);

  const [isNavigating, setIsNavigating] = useState(false);

  const handleCreateChat = (item) => {
    if (isNavigating) return;
    setIsNavigating(true);

    navigation.replace("ChatDetail", { 
        id: 'pending',
        title: item.name, 
        image: item.image,
        targetId: item.id,
        targetType: item.userType,
        targetName: item.name
    });

    setTimeout(() => setIsNavigating(false), 500);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleCreateChat(item)}>
      <View style={styles.avatarContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#f0f0f0' }]}>
            <Text style={styles.avatarLetter}>{item.name[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemType}>{item.userType === 'staff' ? 'Staff' : 'Member'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'members' && styles.activeTab]} 
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'staff' && styles.activeTab]} 
          onPress={() => setActiveTab('staff')}
        >
          <Text style={[styles.tabText, activeTab === 'staff' && styles.activeTabText]}>Staffs</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={color.primary} />
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.userType || item.type}-${item.id}-${index}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No people found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 15,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemType: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: color.primary,
    fontWeight: 'bold',
  }
});
