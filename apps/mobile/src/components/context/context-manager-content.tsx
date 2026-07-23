import type { CalendarEvent, RoutineBlock, TimeBlock } from '@ai-stylish/shared';
import * as Calendar from 'expo-calendar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';
import { useContextStore } from '@/state/context-store';

const TIME_BLOCKS: { value: TimeBlock; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'workday', label: 'Workday' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function combineTodayWithTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d.toISOString();
}

function EventRow({
  event,
  onCorrect,
  onDelete,
}: {
  event: CalendarEvent;
  onCorrect: (id: string, field: 'inferred_event_type' | 'inferred_formality', value: string) => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const [eventType, setEventType] = useState(event.inferred_event_type ?? '');
  const [formality, setFormality] = useState(event.inferred_formality ?? '');

  return (
    <ThemedView type="backgroundElement" style={[styles.eventRow, { borderColor: theme.border }]}>
      <View style={styles.eventRowHeader}>
        <View style={styles.eventRowTitle}>
          <ThemedText type="smallBold">{event.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatTime(event.start_ts)}
            {event.location ? ` · ${event.location}` : ''}
          </ThemedText>
        </View>
        <Pressable onPress={() => onDelete(event.id)} testID={`event-delete-${event.id}`}>
          <ThemedText type="smallBold" themeColor="negative">
            ✕
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.chipRow}>
        <TextInput
          style={[styles.chipInput, { color: theme.text, borderColor: theme.border }]}
          value={eventType}
          onChangeText={setEventType}
          onBlur={() => onCorrect(event.id, 'inferred_event_type', eventType)}
          placeholder="type"
          placeholderTextColor={theme.textSecondary}
          testID={`event-type-${event.id}`}
        />
        <TextInput
          style={[styles.chipInput, { color: theme.text, borderColor: theme.border }]}
          value={formality}
          onChangeText={setFormality}
          onBlur={() => onCorrect(event.id, 'inferred_formality', formality)}
          placeholder="formality"
          placeholderTextColor={theme.textSecondary}
          testID={`event-formality-${event.id}`}
        />
      </View>
    </ThemedView>
  );
}

export function ContextManagerContent({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const {
    snapshot,
    routines,
    error,
    fetchRoutines,
    syncCalendarEvents,
    updateEvent,
    deleteEvent,
    addRoutine,
    deleteRoutine,
    clearError,
  } = useContextStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const [routineName, setRoutineName] = useState('');
  const [routineRecurrence, setRoutineRecurrence] = useState('');
  const [routineBlock, setRoutineBlock] = useState<TimeBlock>('morning');
  const [isAddingRoutine, setIsAddingRoutine] = useState(false);

  useEffect(() => {
    if (token) fetchRoutines(token);
  }, [token, fetchRoutines]);

  const handleAddEvent = async () => {
    if (!token || !newTitle.trim()) return;
    setIsAddingEvent(true);
    try {
      await syncCalendarEvents(token, [
        {
          source: 'manual',
          title: newTitle.trim(),
          start_ts: combineTodayWithTime(newTime || '09:00'),
          location: newLocation.trim() || undefined,
        },
      ]);
      setNewTitle('');
      setNewTime('');
      setNewLocation('');
    } catch {
      // error surfaced via store error state
    } finally {
      setIsAddingEvent(false);
    }
  };

  const handleSyncFromCalendar = async () => {
    if (!token) return;
    setIsSyncing(true);
    clearError();
    try {
      const permission = await Calendar.requestCalendarPermissions();
      if (!permission.granted) return;

      const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const events = await Calendar.listEvents(calendars, startOfToday, endOfToday);

      await syncCalendarEvents(
        token,
        events.map((e) => ({
          source: 'device_calendar' as const,
          external_id: e.id,
          title: e.title,
          start_ts: new Date(e.startDate).toISOString(),
          end_ts: e.endDate ? new Date(e.endDate).toISOString() : undefined,
          location: e.location ?? undefined,
        }))
      );
    } catch {
      // error surfaced via store error state
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddRoutine = async () => {
    if (!token || !routineName.trim() || !routineRecurrence.trim()) return;
    setIsAddingRoutine(true);
    try {
      await addRoutine(token, {
        name: routineName.trim(),
        recurrence_rule: routineRecurrence.trim(),
        time_block: routineBlock,
      });
      setRoutineName('');
      setRoutineRecurrence('');
    } catch {
      // error surfaced via store error state
    } finally {
      setIsAddingRoutine(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} testID="context-manager-back">
        <ThemedText type="linkPrimary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title" style={styles.title}>
        Today
      </ThemedText>

      <ThemedText type="label" themeColor="accent" style={styles.sectionTitle}>
        Events
      </ThemedText>

      {snapshot?.events.length ? (
        snapshot.events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            onCorrect={(id, field, value) => {
              if (!token) return;
              updateEvent(token, id, { [field]: value }).catch(() => {});
            }}
            onDelete={(id) => {
              if (!token) return;
              deleteEvent(token, id).catch(() => {});
            }}
          />
        ))
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No events yet today.
        </ThemedText>
      )}

      <ThemedView type="backgroundElement" style={[styles.addForm, { borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Event title"
          placeholderTextColor={theme.textSecondary}
          value={newTitle}
          onChangeText={setNewTitle}
          testID="event-add-title"
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Start time (HH:MM)"
          placeholderTextColor={theme.textSecondary}
          value={newTime}
          onChangeText={setNewTime}
          testID="event-add-time"
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Location (optional)"
          placeholderTextColor={theme.textSecondary}
          value={newLocation}
          onChangeText={setNewLocation}
          testID="event-add-location"
        />
        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: theme.accent },
            (isAddingEvent || !newTitle.trim()) && styles.disabled,
          ]}
          onPress={handleAddEvent}
          disabled={isAddingEvent || !newTitle.trim()}
          testID="event-add-submit">
          {isAddingEvent ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <ThemedText type="default" style={[styles.primaryButtonText, { color: theme.accentText }]}>
              Add event
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>

      {Platform.OS !== 'web' ? (
        <Pressable
          style={[styles.secondaryButton, { borderColor: theme.border }, isSyncing && styles.disabled]}
          onPress={handleSyncFromCalendar}
          disabled={isSyncing}
          testID="context-sync-calendar">
          {isSyncing ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <ThemedText type="default">Sync from calendar</ThemedText>
          )}
        </Pressable>
      ) : null}

      <ThemedText type="label" themeColor="accent" style={styles.sectionTitle}>
        Routines
      </ThemedText>

      {routines.length ? (
        routines.map((routine) => (
          <ThemedView
            key={routine.id}
            type="backgroundElement"
            style={[styles.routineRow, { borderColor: theme.border }]}>
            <View style={styles.eventRowTitle}>
              <ThemedText type="smallBold">{routine.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {routine.time_block} · {routine.recurrence_rule}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => token && deleteRoutine(token, routine.id).catch(() => {})}
              testID={`routine-delete-${routine.id}`}>
              <ThemedText type="smallBold" themeColor="negative">
                ✕
              </ThemedText>
            </Pressable>
          </ThemedView>
        ))
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No routines yet.
        </ThemedText>
      )}

      <ThemedView type="backgroundElement" style={[styles.addForm, { borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Routine name (e.g. Gym then office)"
          placeholderTextColor={theme.textSecondary}
          value={routineName}
          onChangeText={setRoutineName}
          testID="routine-add-name"
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Recurrence (e.g. weekdays)"
          placeholderTextColor={theme.textSecondary}
          value={routineRecurrence}
          onChangeText={setRoutineRecurrence}
          testID="routine-add-recurrence"
        />
        <View style={styles.blockRow}>
          {TIME_BLOCKS.map((block) => (
            <Pressable
              key={block.value}
              style={[
                styles.blockOption,
                { borderColor: theme.border },
                routineBlock === block.value && {
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                },
              ]}
              onPress={() => setRoutineBlock(block.value)}
              testID={`routine-block-${block.value}`}>
              <ThemedText
                type="small"
                themeColor={routineBlock === block.value ? 'accentText' : 'text'}>
                {block.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: theme.accent },
            (isAddingRoutine || !routineName.trim() || !routineRecurrence.trim()) && styles.disabled,
          ]}
          onPress={handleAddRoutine}
          disabled={isAddingRoutine || !routineName.trim() || !routineRecurrence.trim()}
          testID="routine-add-submit">
          {isAddingRoutine ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <ThemedText type="default" style={[styles.primaryButtonText, { color: theme.accentText }]}>
              Add routine
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>

      {error ? (
        <ThemedText type="small" themeColor="negative">
          {error}
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
  eventRow: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  eventRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventRowTitle: {
    gap: Spacing.half,
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chipInput: {
    fontFamily: Fonts.sans,
    flex: 1,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 13,
  },
  addForm: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    fontFamily: Fonts.sans,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: Spacing.one,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: Fonts.sansSemiBold,
  },
  secondaryButton: {
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  routineRow: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  blockRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  blockOption: {
    flex: 1,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
