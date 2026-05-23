import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, TextInput, Switch, Platform, Alert, KeyboardAvoidingView, Modal, ScrollView } from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Circle, Calendar, Bell, ChevronRight, AlertCircle, X, FileText } from 'lucide-react-native';
import { tasksDb } from '@/lib/database';
import type { Task } from '@/types';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CARD_BG_IMAGE = 'https://fv5-4.files.fm/thumb_show.php?i=qnpyxuvuy5&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724';

export default function TodosScreen() {
  const queryClient = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTaskForDate, setSelectedTaskForDate] = useState<Task | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('active');
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [selectedTaskForNotes, setSelectedTaskForNotes] = useState<Task | null>(null);
  const [notesText, setNotesText] = useState('');

  const { data: allTasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksDb.getAll(),
  });

  const filteredTasks = allTasks.filter((t) => {
    if (filterMode === 'active') return !t.isDone;
    if (filterMode === 'completed') return t.isDone;
    return true;
  }).sort((a, b) => {
    if (a.priority && b.priority) {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (a.priority) return -1;
    if (b.priority) return 1;
    return b.createdAt - a.createdAt;
  });

  const createMutation = useMutation({
    mutationFn: (task: Task) => tasksDb.create(task),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTaskTitle('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (task: Task) => tasksDb.update(task),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksDb.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const scheduleNotification = async (task: Task) => {
    if (Platform.OS === 'web') return null;

    if (!task.dueDate || !task.reminderEnabled) return null;

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications to use reminders');
        return null;
      }

      const dueDate = new Date(task.dueDate);
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes));
      }

      const reminderTime = new Date(dueDate.getTime() - 15 * 60 * 1000);

      if (reminderTime.getTime() <= Date.now()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body: task.title,
          data: { taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  };

  const handleQuickAdd = async () => {
    if (!newTaskTitle.trim()) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      notes: '',
      dueDate: null,
      dueTime: null,
      isDone: false,
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedDate: null,
      reminderEnabled: false,
      reminderTime: null,
      notificationId: null,
      priority: null,
    };

    createMutation.mutate(task);
  };

  const toggleTask = async (task: Task) => {
    const updatedTask: Task = {
      ...task,
      isDone: !task.isDone,
      completedDate: !task.isDone ? Date.now() : null,
      updatedAt: Date.now(),
    };

    if (!task.isDone && task.notificationId) {
      await cancelNotification(task.notificationId);
      updatedTask.notificationId = null;
    }

    updateMutation.mutate(updatedTask);
  };

  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && selectedTaskForDate) {
      const updatedTask: Task = {
        ...selectedTaskForDate,
        dueDate: selectedDate.getTime(),
        updatedAt: Date.now(),
      };
      updateMutation.mutate(updatedTask);
      setShowTimePicker(true);
    }
  };

  const handleTimeSelect = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && selectedTaskForDate) {
      const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
      
      if (selectedTaskForDate.notificationId) {
        await cancelNotification(selectedTaskForDate.notificationId);
      }

      const updatedTask: Task = {
        ...selectedTaskForDate,
        dueTime: timeString,
        updatedAt: Date.now(),
      };

      const notificationId = await scheduleNotification(updatedTask);
      if (notificationId) {
        updatedTask.notificationId = notificationId;
      }

      updateMutation.mutate(updatedTask);
      setSelectedTaskForDate(null);
    } else {
      setSelectedTaskForDate(null);
    }
  };

  const toggleReminder = async (task: Task) => {
    const newReminderState = !task.reminderEnabled;

    if (!newReminderState && task.notificationId) {
      await cancelNotification(task.notificationId);
    }

    const updatedTask: Task = {
      ...task,
      reminderEnabled: newReminderState,
      notificationId: newReminderState ? task.notificationId : null,
      updatedAt: Date.now(),
    };

    if (newReminderState && task.dueDate) {
      const notificationId = await scheduleNotification(updatedTask);
      if (notificationId) {
        updatedTask.notificationId = notificationId;
      }
    }

    updateMutation.mutate(updatedTask);
  };

  const changePriority = (task: Task) => {
    const priorities: ('low' | 'medium' | 'high' | null)[] = [null, 'low', 'medium', 'high'];
    const currentIndex = priorities.indexOf(task.priority);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];

    const updatedTask: Task = {
      ...task,
      priority: nextPriority,
      updatedAt: Date.now(),
    };

    updateMutation.mutate(updatedTask);
  };

  const openNotesModal = (task: Task) => {
    setSelectedTaskForNotes(task);
    setNotesText(task.notes || '');
    setNotesModalVisible(true);
  };

  const saveNotes = () => {
    if (!selectedTaskForNotes) return;

    const updatedTask: Task = {
      ...selectedTaskForNotes,
      notes: notesText,
      updatedAt: Date.now(),
    };

    updateMutation.mutate(updatedTask);
    setNotesModalVisible(false);
    setSelectedTaskForNotes(null);
    setNotesText('');
  };

  const cancelNotes = () => {
    setNotesModalVisible(false);
    setSelectedTaskForNotes(null);
    setNotesText('');
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#666';
    }
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate || task.isDone) return false;
    const now = Date.now();
    const due = task.dueDate;
    return due < now;
  };

  const isTaskDueSoon = (task: Task) => {
    if (!task.dueDate || task.isDone) return false;
    const now = Date.now();
    const due = task.dueDate;
    const hourInMs = 60 * 60 * 1000;
    return due > now && due < now + (24 * hourInMs);
  };

  const renderTask = ({ item }: { item: Task }) => {
    const isExpanded = expandedTaskId === item.id;
    const overdue = isTaskOverdue(item);
    const dueSoon = isTaskDueSoon(item);

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskMainRow}>
          <TouchableOpacity
            onPress={() => toggleTask(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {item.isDone ? (
              <CheckCircle2 color="#10b981" size={24} fill="#10b981" />
            ) : (
              <Circle color={getPriorityColor(item.priority)} size={24} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.taskContent}
            onPress={() => setExpandedTaskId(isExpanded ? null : item.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.taskTitle, item.isDone && styles.taskTitleDone]}>
              {item.title}
            </Text>
            
            <View style={styles.taskMetaRow}>
              {item.dueDate && (
                <View style={[styles.dueBadge, overdue && styles.overdueBadge, dueSoon && styles.dueSoonBadge]}>
                  <Calendar size={12} color={overdue ? '#fff' : dueSoon ? '#f59e0b' : '#6366f1'} />
                  <Text style={[styles.dueText, overdue && styles.overdueText]}>
                    {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {item.dueTime && ` ${item.dueTime}`}
                  </Text>
                </View>
              )}
              
              {item.reminderEnabled && (
                <Bell size={12} color="#10b981" />
              )}

              {overdue && (
                <AlertCircle size={12} color="#ef4444" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openNotesModal(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.notesButton}
          >
            <Plus size={20} color="#10b981" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setExpandedTaskId(isExpanded ? null : item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronRight 
              size={20} 
              color="#666" 
              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.taskExpandedSection}>
            <View style={styles.taskActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openNotesModal(item)}
              >
                <Plus size={16} color="#10b981" />
                <Text style={styles.actionButtonText}>Notes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedTaskForDate(item);
                  setShowDatePicker(true);
                }}
              >
                <Calendar size={16} color="#6366f1" />
                <Text style={styles.actionButtonText}>
                  {item.dueDate ? 'Change Date' : 'Set Date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => changePriority(item)}
              >
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
                <Text style={styles.actionButtonText}>
                  {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Priority'}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Remind</Text>
                <Switch
                  value={item.reminderEnabled}
                  onValueChange={() => toggleReminder(item)}
                  trackColor={{ false: '#2a2a2a', true: '#6366f1' }}
                  thumbColor="#fff"
                  disabled={!item.dueDate}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => {
                  Alert.alert(
                    'Delete Task',
                    'Are you sure you want to delete this task?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: async () => {
                          if (item.notificationId) {
                            await cancelNotification(item.notificationId);
                          }
                          deleteMutation.mutate(item.id);
                        }
                      },
                    ]
                  );
                }}
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>

            {item.notes && item.notes.trim() !== '' && (
              <View style={styles.notesPreview}>
                <FileText size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.taskNotes} numberOfLines={2}>{item.notes}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Image source={{ uri: CARD_BG_IMAGE }} style={styles.backgroundImage} contentFit="cover" />
      <View style={styles.overlay} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>To-Do List</Text>
        <View style={styles.filterButtons}>
          {(['active', 'all', 'completed'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.filterButton, filterMode === mode && styles.filterButtonActive]}
              onPress={() => setFilterMode(mode)}
            >
              <Text style={[styles.filterButtonText, filterMode === mode && styles.filterButtonTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.quickAddContainer}>
        <Circle color="#6366f1" size={20} />
        <TextInput
          style={styles.quickAddInput}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          placeholder="Add a task..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          onSubmitEditing={handleQuickAdd}
          returnKeyType="done"
        />
        {newTaskTitle.length > 0 && (
          <TouchableOpacity onPress={handleQuickAdd}>
            <Plus color="#6366f1" size={24} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <LoadingState message="Loading tasks..." />
      ) : isError ? (
        <ErrorState message="Could not load tasks" onRetry={refetch} />
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle2 color="rgba(255,255,255,0.3)" size={64} />
          <Text style={styles.emptyText}>
            {filterMode === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {filterMode === 'active' ? 'Add a task above to get started' : 'Start adding tasks to see them here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {Platform.OS !== 'web' && showDatePicker && selectedTaskForDate && (
        <DateTimePicker
          value={selectedTaskForDate.dueDate ? new Date(selectedTaskForDate.dueDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateSelect}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS !== 'web' && showTimePicker && selectedTaskForDate && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeSelect}
        />
      )}

      <Modal
        visible={notesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelNotes}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <FileText size={24} color="#10b981" />
                <Text style={styles.modalTitle}>Add Notes</Text>
              </View>
              <TouchableOpacity onPress={cancelNotes} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedTaskForNotes && (
              <View style={styles.modalTaskInfo}>
                <Text style={styles.modalTaskTitle}>{selectedTaskForNotes.title}</Text>
              </View>
            )}

            <ScrollView style={styles.notesInputContainer} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.notesInput}
                value={notesText}
                onChangeText={setNotesText}
                placeholder="Add your notes here...\n\nYou have plenty of space to write down details, ideas, or anything related to this task."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={cancelNotes}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={saveNotes}>
                <Text style={styles.modalSaveText}>Save Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600' as const,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  quickAddContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '400' as const,
  },
  list: {
    padding: 20,
    paddingTop: 8,
  },
  taskCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  taskMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  taskContent: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#fff',
    lineHeight: 22,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.4)',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 10,
  },
  overdueBadge: {
    backgroundColor: '#ef4444',
  },
  dueSoonBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  dueText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600' as const,
  },
  overdueText: {
    color: '#fff',
  },
  taskExpandedSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  taskActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deleteButton: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  notesPreview: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  taskNotes: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  modalTaskInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTaskTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#fff',
  },
  notesInputContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  notesInput: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    minHeight: 300,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  notesButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
});
