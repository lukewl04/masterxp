import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function App() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();

  // --- XP / Level state ---
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [loadingXP, setLoadingXP] = useState(false);
  const [error, setError] = useState(null);

  // --- Todo state (local-only) ---
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const auth0Id = user?.sub;

  const todayStr = useMemo(() => formatDate(new Date()), []);

  const todayTodos = useMemo(
    () => todos.filter((t) => t.date === todayStr),
    [todos, todayStr]
  );

  const completedCount = useMemo(
    () => todayTodos.filter((t) => t.completed).length,
    [todayTodos]
  );

  const progressPct = useMemo(() => {
    if (todayTodos.length === 0) return 0;
    return Math.round((completedCount / todayTodos.length) * 100);
  }, [completedCount, todayTodos.length]);

  const xpThisLevel = useMemo(() => xp % 100, [xp]);
  const xpToNext = useMemo(() => 100 - xpThisLevel, [xpThisLevel]);

  // ---------------- XP + Supabase ----------------
  async function fetchOrCreateUser() {
    if (!auth0Id) return;

    try {
      setLoadingXP(true);
      setError(null);

      const { data, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('auth0_id', auth0Id)
        .maybeSingle();

      if (selectError) throw selectError;

      if (data) {
        setXp(data.xp);
        setLevel(data.level);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert({ auth0_id: auth0Id, xp: 0, level: 1 })
          .select()
          .single();

        if (insertError) throw insertError;

        setXp(inserted.xp);
        setLevel(inserted.level);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading user');
    } finally {
      setLoadingXP(false);
    }
  }

  const gainXp = useCallback(
    async (amount) => {
      if (!auth0Id || amount <= 0) return;

      try {
        setLoadingXP(true);
        setError(null);

        // Use functional update pattern to avoid stale xp issues
        const newXp = xp + amount;
        const newLevel = Math.floor(newXp / 100) + 1;

        const { data, error: updateError } = await supabase
          .from('users')
          .update({ xp: newXp, level: newLevel })
          .eq('auth0_id', auth0Id)
          .select()
          .single();

        if (updateError) throw updateError;

        setXp(data.xp);
        setLevel(data.level);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error updating XP');
      } finally {
        setLoadingXP(false);
      }
    },
    [auth0Id, xp]
  );

  useEffect(() => {
    if (isAuthenticated && auth0Id) fetchOrCreateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, auth0Id]);

  // ---------------- Todos ----------------
  function addTodo(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const newTodo = {
      id: crypto.randomUUID(),
      text,
      date: todayStr,
      completed: false,
      xpAwarded: false,
      createdAt: Date.now(),
    };

    setTodos((prev) => [newTodo, ...prev]);
    setInput('');
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        const nowCompleted = !t.completed;

        // Award 1 XP only the first time it becomes completed
        if (nowCompleted && !t.xpAwarded) {
          gainXp(1);
          return { ...t, completed: true, xpAwarded: true };
        }

        // Allow unchecking without removing XP
        return { ...t, completed: nowCompleted };
      })
    );
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !(t.date === todayStr && t.completed)));
  }

  // ---------------- UI helpers ----------------
  const displayName = user?.given_name || user?.name || 'there';

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-white">
        <div className="text-center">
          <div className="spinner-border" role="status" />
          <p className="mt-3 mb-0">Loading auth…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Top Nav */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
        <div className="container">
          <div className="d-flex align-items-center gap-2">
            <span className="badge text-bg-primary rounded-pill">MXP</span>
            <span className="navbar-brand mb-0 fw-bold">Master XP</span>
          </div>

          <div className="ms-auto d-flex align-items-center gap-2">
            {!isAuthenticated ? (
              <button className="btn btn-primary" onClick={() => loginWithRedirect()}>
                Log in
              </button>
            ) : (
              <>
                <span className="text-secondary d-none d-sm-inline">
                  Hi, <span className="fw-semibold text-dark">{displayName}</span>
                </span>
                <button
                  className="btn btn-outline-dark"
                  onClick={() =>
                    logout({ logoutParams: { returnTo: window.location.origin } })
                  }
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="container py-4">
        {!isAuthenticated ? (
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-body p-4 p-md-5 text-center">
                  <h1 className="fw-bold mb-2">Today’s checklist, gamified.</h1>
                  <p className="text-secondary mb-4">
                    Log in to track XP and level up by completing tasks.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={() => loginWithRedirect()}>
                    Continue with Auth0
                  </button>
                  <div className="mt-4 text-secondary small">
                    Complete a task = <span className="fw-semibold text-dark">+1 XP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-danger shadow-sm" role="alert">
                <div className="fw-semibold">Something went wrong</div>
                <div className="small">{error}</div>
              </div>
            )}

            <div className="row g-3">
              {/* Left: XP Card */}
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-start justify-content-between">
                      <div>
                        <div className="text-secondary small">Level</div>
                        <div className="display-6 fw-bold mb-0">{level}</div>
                      </div>
                      <span className="badge text-bg-success rounded-pill">
                        {loadingXP ? 'Syncing…' : 'Live'}
                      </span>
                    </div>

                    <hr />

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-secondary small">Total XP</div>
                        <div className="h3 fw-bold mb-0">{xp}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-secondary small">Next level</div>
                        <div className="fw-semibold">{xpToNext} XP</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="d-flex justify-content-between small text-secondary mb-1">
                        <span>Progress</span>
                        <span>{xpThisLevel}/100</span>
                      </div>
                      <div className="progress" style={{ height: 10 }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${xpThisLevel}%` }}
                          aria-valuenow={xpThisLevel}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                    </div>

                    <div className="mt-3 small text-secondary">
                      Tip: checking a task for the first time gives <span className="fw-semibold text-dark">+1 XP</span>.
                      Unchecking won’t remove XP.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Todos */}
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div>
                        <h2 className="h4 fw-bold mb-1">Today</h2>
                        <div className="text-secondary small">{todayStr}</div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span className="badge text-bg-dark rounded-pill">
                          {completedCount}/{todayTodos.length} done
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={clearCompleted}
                          disabled={completedCount === 0}
                        >
                          Clear completed
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="d-flex justify-content-between small text-secondary mb-1">
                        <span>Daily completion</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="progress" style={{ height: 10 }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${progressPct}%` }}
                          aria-valuenow={progressPct}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                    </div>

                    <form className="mt-4" onSubmit={addTodo}>
                      <div className="input-group input-group-lg">
                        <input
                          className="form-control"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Add a task for today…"
                          aria-label="Add a task"
                        />
                        <button className="btn btn-primary" type="submit">
                          Add
                        </button>
                      </div>
                      <div className="form-text">
                        Keep them small. Stack XP fast.
                      </div>
                    </form>

                    <div className="mt-4">
                      {todayTodos.length === 0 ? (
                        <div className="text-center py-5">
                          <div className="display-6">✅</div>
                          <h3 className="h5 fw-bold mt-2">No tasks yet</h3>
                          <p className="text-secondary mb-0">
                            Add your first task above and start earning XP.
                          </p>
                        </div>
                      ) : (
                        <ul className="list-group list-group-flush">
                          {todayTodos.map((todo) => (
                            <li
                              key={todo.id}
                              className="list-group-item d-flex align-items-center gap-3 py-3"
                            >
                              <input
                                className="form-check-input mt-0"
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => toggleTodo(todo.id)}
                                aria-label={`Toggle ${todo.text}`}
                                style={{ width: 20, height: 20 }}
                              />

                              <div className="flex-grow-1">
                                <div
                                  className={`fw-semibold ${
                                    todo.completed ? 'text-decoration-line-through text-secondary' : ''
                                  }`}
                                >
                                  {todo.text}
                                </div>

                                <div className="small text-secondary d-flex align-items-center gap-2">
                                  {todo.xpAwarded ? (
                                    <span className="badge text-bg-success rounded-pill">
                                      +1 XP earned
                                    </span>
                                  ) : (
                                    <span className="badge text-bg-primary rounded-pill">
                                      +1 XP on completion
                                    </span>
                                  )}

                                  {todo.completed && (
                                    <span className="badge text-bg-light border text-secondary rounded-pill">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteTodo(todo.id)}
                              >
                                Delete
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-secondary small">
                  Complete a task = <span className="fw-semibold text-dark">+1 XP</span>. Level up every 100 XP.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
