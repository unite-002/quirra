// src/components/GoalSetting.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { PlusCircle, CheckCircle, Edit, Trash2, Loader2, XCircle, Target, BookOpen, Clock, Archive, PauseCircle, PlayCircle } from "lucide-react"; // Added PauseCircle, PlayCircle

// Define the Goal interface
interface UserGoal {
  id: string;
  user_id: string;
  goal_text: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  due_date: string | null; // ISO date string
  created_at: string;
  updated_at: string;
}

// Define the ModalState interface for custom modals
interface ModalState {
  isOpen: boolean;
  type: 'confirm' | 'prompt' | 'info';
  title: string;
  message: string;
  inputValue?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

export function GoalSetting() {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [newGoalText, setNewGoalText] = useState<string>("");
  const [newGoalDescription, setNewGoalDescription] = useState<string>("");
  const [newGoalDueDate, setNewGoalDueDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddingGoal, setIsAddingGoal] = useState<boolean>(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState<string>("");
  const [editingGoalDescription, setEditingGoalDescription] = useState<string>("");
  const [editingGoalDueDate, setEditingGoalDueDate] = useState<string>("");
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });
  const modalInputRef = useRef<HTMLInputElement>(null); // Ref for modal prompt input

  // Effect to focus modal input when it opens
  useEffect(() => {
    if (modalState.isOpen && modalState.type === 'prompt' && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [modalState]);

  const displayInAppMessage = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // This is a placeholder for a real in-app notification system (e.g., toast, snackbar)
    // For now, we'll just log to console and use the modal for critical messages.
    console.log(`[App Message - ${type.toUpperCase()}]: ${message}`);
    // For demonstration, we'll use a simple alert-like modal for important feedback.
    setModalState({
      isOpen: true,
      type: 'info',
      title: type === 'error' ? 'Error' : (type === 'success' ? 'Success' : 'Information'),
      message: message,
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })),
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false })),
    });
  }, []);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      displayInAppMessage("You must be logged in to view goals.", "error");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching goals:", error);
      displayInAppMessage("Failed to load your goals.", "error");
    } else {
      setGoals(data as UserGoal[]);
    }
    setLoading(false);
  }, [displayInAppMessage]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) {
      displayInAppMessage("Goal text cannot be empty.", "error");
      return;
    }

    setIsAddingGoal(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      displayInAppMessage("You must be logged in to add a goal.", "error");
      setIsAddingGoal(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: user.id,
        goal_text: newGoalText.trim(),
        description: newGoalDescription.trim() || null,
        due_date: newGoalDueDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding goal:", error);
      displayInAppMessage("Failed to add goal.", "error");
    } else {
      setGoals(prev => [data as UserGoal, ...prev]);
      setNewGoalText("");
      setNewGoalDescription("");
      setNewGoalDueDate("");
      displayInAppMessage("Goal added successfully!", "success");
    }
    setIsAddingGoal(false);
  };

  const handleEditClick = (goal: UserGoal) => {
    setEditingGoalId(goal.id);
    setEditingGoalText(goal.goal_text);
    setEditingGoalDescription(goal.description || "");
    setEditingGoalDueDate(goal.due_date || "");
  };

  const handleSaveEdit = async (goalId: string) => {
    if (!editingGoalText.trim()) {
      displayInAppMessage("Goal text cannot be empty.", "error");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      displayInAppMessage("You must be logged in to edit a goal.", "error");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_goals')
      .update({
        goal_text: editingGoalText.trim(),
        description: editingGoalDescription.trim() || null,
        due_date: editingGoalDueDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', user.id) // Ensure user owns the goal
      .select()
      .single();

    if (error) {
      console.error("Error updating goal:", error);
      displayInAppMessage("Failed to update goal.", "error");
    } else {
      setGoals(prev => prev.map(g => (g.id === goalId ? (data as UserGoal) : g)));
      setEditingGoalId(null);
      displayInAppMessage("Goal updated successfully!", "success");
    }
    setLoading(false);
  };

  const handleStatusChange = async (goalId: string, newStatus: UserGoal['status']) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: `Confirm Status Change to '${newStatus.replace('_', ' ').toUpperCase()}'`,
      message: `Are you sure you want to change the status of this goal to '${newStatus.replace('_', ' ')}'?`,
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false })); // Close modal immediately
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          displayInAppMessage("You must be logged in to update goal status.", "error");
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('user_goals')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', goalId)
          .eq('user_id', user.id);

        if (error) {
          console.error(`Error changing goal status to ${newStatus}:`, error);
          displayInAppMessage(`Failed to change goal status to ${newStatus}.`, "error");
        } else {
          setGoals(prev => prev.map(g => (g.id === goalId ? { ...g, status: newStatus } : g)));
          displayInAppMessage(`Goal status changed to '${newStatus}' successfully!`, "success");
        }
        setLoading(false);
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false })),
    });
  };

  const handleDeleteGoal = async (goalId: string) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Goal',
      message: 'Are you sure you want to delete this goal? This action cannot be undone.',
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false })); // Close modal immediately
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          displayInAppMessage("You must be logged in to delete a goal.", "error");
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('user_goals')
          .delete()
          .eq('id', goalId)
          .eq('user_id', user.id); // Ensure user owns the goal

        if (error) {
          console.error("Error deleting goal:", error);
          displayInAppMessage("Failed to delete goal.", "error");
        } else {
          setGoals(prev => prev.filter(g => g.id !== goalId));
          displayInAppMessage("Goal deleted successfully!", "success");
        }
        setLoading(false);
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false })),
    });
  };

  const getStatusColor = (status: UserGoal['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'archived': return 'bg-gray-600';
      case 'on_hold': return 'bg-yellow-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#1a213a] p-6 rounded-xl shadow-lg border border-[#2a304e] text-white w-full max-w-2xl mx-auto my-8">
      <h2 className="text-3xl font-bold text-blue-400 mb-6 text-center">Your Goals</h2>

      {/* Custom Modal Overlay */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
          <div className="bg-[#1a213a] p-6 rounded-lg shadow-xl border border-[#2a304e] w-full max-w-md mx-4 relative animate-scaleIn">
            <button
              onClick={() => modalState.onCancel()}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <XCircle size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">{modalState.title}</h3>
            <p className="text-gray-300 mb-6">{modalState.message}</p>
            {modalState.type === 'prompt' && (
              <input
                ref={modalInputRef}
                type="text"
                className="w-full bg-[#0A0B1A] text-white rounded-md px-4 py-2 mb-6 border border-[#2a304e] focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={modalState.inputValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    modalState.onConfirm((e.target as HTMLInputElement).value);
                  }
                }}
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => modalState.onCancel()}
                className="px-5 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => modalState.onConfirm(modalState.type === 'prompt' ? modalInputRef.current?.value : undefined)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                {modalState.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Goal Form */}
      <form onSubmit={handleAddGoal} className="mb-8 p-4 border border-[#2a304e] rounded-lg bg-[#0A0B1A] shadow-inner">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Add a New Goal</h3>
        <div className="mb-4">
          <label htmlFor="goalText" className="block text-gray-300 text-sm font-bold mb-2">Goal:</label>
          <input
            type="text"
            id="goalText"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            placeholder="e.g., Learn React Native"
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            disabled={isAddingGoal}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="goalDescription" className="block text-gray-300 text-sm font-bold mb-2">Description (Optional):</label>
          <textarea
            id="goalDescription"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 resize-y min-h-[60px]"
            placeholder="e.g., Understand core concepts and build a simple app."
            value={newGoalDescription}
            onChange={(e) => setNewGoalDescription(e.target.value)}
            disabled={isAddingGoal}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="goalDueDate" className="block text-gray-300 text-sm font-bold mb-2">Due Date (Optional):</label>
          <input
            type="date"
            id="goalDueDate"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            value={newGoalDueDate}
            onChange={(e) => setNewGoalDueDate(e.target.value)}
            disabled={isAddingGoal}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isAddingGoal || !newGoalText.trim()}
        >
          {isAddingGoal ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
          {isAddingGoal ? "Adding Goal..." : "Add Goal"}
        </button>
      </form>

      {/* Goals List */}
      <h3 className="text-xl font-semibold text-gray-100 mb-4">My Goals ({goals.length})</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-blue-400" size={32} />
          <p className="text-gray-400 ml-3">Loading goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No goals set yet. Add one above!</p>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className={`p-4 rounded-lg border ${editingGoalId === goal.id ? 'border-blue-500 bg-[#1f2a4a]' : 'border-[#2a304e] bg-[#0A0B1A]'} shadow-md transition-all duration-200`}
            >
              {editingGoalId === goal.id ? (
                // Edit mode
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    value={editingGoalText}
                    onChange={(e) => setEditingGoalText(e.target.value)}
                  />
                  <textarea
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white resize-y min-h-[50px]"
                    placeholder="Description"
                    value={editingGoalDescription}
                    onChange={(e) => setEditingGoalDescription(e.target.value)}
                  />
                  <input
                    type="date"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    value={editingGoalDueDate}
                    onChange={(e) => setEditingGoalDueDate(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      onClick={() => setEditingGoalId(null)}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-md text-white text-sm"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(goal.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm flex items-center gap-1"
                      disabled={loading || !editingGoalText.trim()}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />} Save
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
                      <Target size={18} /> {goal.goal_text}
                    </h4>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                      {goal.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {goal.description && (
                    <p className="text-gray-300 text-sm mb-2 flex items-start gap-2">
                        <BookOpen size={16} className="flex-shrink-0 mt-0.5" /> {goal.description}
                    </p>
                  )}
                  {goal.due_date && (
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <Clock size={14} /> Due: {new Date(goal.due_date).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4 justify-end">
                    {/* Status change buttons */}
                    {goal.status === 'active' && (
                        <button
                            onClick={() => handleStatusChange(goal.id, 'completed')}
                            className="p-2 bg-green-700 hover:bg-green-800 rounded-full text-white transition-colors"
                            title="Mark as Completed"
                            disabled={loading}
                        >
                            <CheckCircle size={18} />
                        </button>
                    )}
                    {goal.status === 'active' && (
                        <button
                            onClick={() => handleStatusChange(goal.id, 'on_hold')}
                            className="p-2 bg-yellow-700 hover:bg-yellow-800 rounded-full text-white transition-colors"
                            title="Put on Hold"
                            disabled={loading}
                        >
                            <PauseCircle size={18} />
                        </button>
                    )}
                    {goal.status === 'on_hold' && (
                        <button
                            onClick={() => handleStatusChange(goal.id, 'active')}
                            className="p-2 bg-blue-700 hover:bg-blue-800 rounded-full text-white transition-colors"
                            title="Mark as Active"
                            disabled={loading}
                        >
                            <PlayCircle size={18} />
                        </button>
                    )}
                    {goal.status !== 'archived' && (
                        <button
                            onClick={() => handleStatusChange(goal.id, 'archived')}
                            className="p-2 bg-gray-700 hover:bg-gray-800 rounded-full text-white transition-colors"
                            title="Archive Goal"
                            disabled={loading}
                        >
                            <Archive size={18} />
                        </button>
                    )}
                    <button
                      onClick={() => handleEditClick(goal)}
                      className="p-2 bg-blue-700 hover:bg-blue-800 rounded-full text-white transition-colors"
                      title="Edit Goal"
                      disabled={loading}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 bg-red-700 hover:bg-red-800 rounded-full text-white transition-colors"
                      title="Delete Goal"
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}