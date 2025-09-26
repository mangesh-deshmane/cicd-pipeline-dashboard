-- Sample data for CI/CD Health Dashboard
-- This file contains sample data to populate the database for testing

-- Insert sample providers
INSERT OR REPLACE INTO providers (id, name, kind, config_json, is_active, created_at) VALUES
(1, 'github-myorg/frontend-app', 'github_actions', '{"repository": "myorg/frontend-app", "description": "Frontend React application"}', true, CURRENT_TIMESTAMP),
(2, 'github-myorg/backend-api', 'github_actions', '{"repository": "myorg/backend-api", "description": "Backend FastAPI service"}', true, CURRENT_TIMESTAMP),
(3, 'github-myorg/mobile-app', 'github_actions', '{"repository": "myorg/mobile-app", "description": "Mobile React Native application"}', true, CURRENT_TIMESTAMP);

-- Insert sample builds with mixed success/failure
INSERT OR REPLACE INTO builds (id, external_id, status, branch, commit_sha, triggered_by, url, started_at, finished_at, duration_seconds, provider_id, raw_payload, created_at) VALUES
-- Successful builds
(1, '123456789', 'success', 'main', 'abc123def456789abcdef123456789abcdef1234', 'johndoe', 'https://github.com/myorg/frontend-app/actions/runs/123456789', '2024-01-15 10:30:00', '2024-01-15 10:33:00', 180, 1, '{"workflow_run": {"id": 123456789, "conclusion": "success", "name": "CI/CD Pipeline"}}', '2024-01-15 10:30:00'),
(2, '987654321', 'success', 'main', 'jkl012mno345abcdef123456789abcdef123456', 'alicejohnson', 'https://github.com/myorg/backend-api/actions/runs/987654321', '2024-01-15 09:00:00', '2024-01-15 09:05:00', 300, 2, '{"workflow_run": {"id": 987654321, "conclusion": "success", "name": "Backend Tests"}}', '2024-01-15 09:00:00'),
(3, '456789123', 'success', 'main', 'stu901vwx234abcdef123456789abcdef123456', 'emilydavis', 'https://github.com/myorg/mobile-app/actions/runs/456789123', '2024-01-15 08:00:00', '2024-01-15 08:07:00', 420, 3, '{"workflow_run": {"id": 456789123, "conclusion": "success", "name": "Mobile Build"}}', '2024-01-15 08:00:00'),

-- Failed builds
(4, '123456790', 'failure', 'feature/new-component', 'def456ghi789abcdef123456789abcdef123456', 'janedoe', 'https://github.com/myorg/frontend-app/actions/runs/123456790', '2024-01-15 11:00:00', '2024-01-15 11:02:00', 120, 1, '{"workflow_run": {"id": 123456790, "conclusion": "failure", "name": "CI/CD Pipeline"}}', '2024-01-15 11:00:00'),
(5, '456789124', 'failure', 'feature/push-notifications', 'vwx234yza567abcdef123456789abcdef123456', 'frankmiller', 'https://github.com/myorg/mobile-app/actions/runs/456789124', '2024-01-15 15:00:00', '2024-01-15 15:10:00', 600, 3, '{"workflow_run": {"id": 456789124, "conclusion": "failure", "name": "Mobile Build"}}', '2024-01-15 15:00:00'),
(6, '987654399', 'failure', 'feature/api-breaking-change', 'xyz789abc012abcdef123456789abcdef123456', 'bobsmith', 'https://github.com/myorg/backend-api/actions/runs/987654399', '2024-01-15 16:00:00', '2024-01-15 16:03:00', 180, 2, '{"workflow_run": {"id": 987654399, "conclusion": "failure", "name": "Backend Tests"}}', '2024-01-15 16:00:00'),

-- Running builds
(7, '123456791', 'in_progress', 'feature/dark-mode', 'ghi789jkl012abcdef123456789abcdef123456', 'bobsmith', 'https://github.com/myorg/frontend-app/actions/runs/123456791', '2024-01-15 12:00:00', NULL, NULL, 1, '{"workflow_run": {"id": 123456791, "status": "in_progress", "name": "CI/CD Pipeline"}}', '2024-01-15 12:00:00'),
(8, '987654322', 'in_progress', 'feature/api-improvements', 'mno345pqr678abcdef123456789abcdef123456', 'charliebrown', 'https://github.com/myorg/backend-api/actions/runs/987654322', '2024-01-15 14:00:00', NULL, NULL, 2, '{"workflow_run": {"id": 987654322, "status": "in_progress", "name": "Backend Tests"}}', '2024-01-15 14:00:00');

-- Insert sample alert configuration
INSERT OR REPLACE INTO alerts (id, type, name, config_json, is_active, created_at) VALUES
(1, 'email', 'Build Failure Alert', '{"recipients": ["alerts@example.com"], "template": "build_failure"}', true, CURRENT_TIMESTAMP),
(2, 'slack', 'Slack Notifications', '{"webhook_url": "https://hooks.slack.com/services/...", "channel": "#alerts"}', true, CURRENT_TIMESTAMP);

-- Insert sample settings
INSERT OR REPLACE INTO settings (id, key, value, description, created_at) VALUES
(1, 'dashboard_title', 'CI/CD Health Dashboard', 'Main dashboard title', CURRENT_TIMESTAMP),
(2, 'refresh_interval', '30', 'Auto-refresh interval in seconds', CURRENT_TIMESTAMP),
(3, 'max_builds_display', '50', 'Maximum number of builds to display', CURRENT_TIMESTAMP);

-- Insert sample metrics
INSERT OR REPLACE INTO metrics (id, metric_name, metric_value, metric_unit, window_start, window_end, created_at) VALUES
(1, 'success_rate', 62.5, 'percentage', '2024-01-15 00:00:00', '2024-01-15 23:59:59', CURRENT_TIMESTAMP),
(2, 'average_build_time', 275.0, 'seconds', '2024-01-15 00:00:00', '2024-01-15 23:59:59', CURRENT_TIMESTAMP),
(3, 'total_builds', 8, 'count', '2024-01-15 00:00:00', '2024-01-15 23:59:59', CURRENT_TIMESTAMP),
(4, 'failed_builds', 3, 'count', '2024-01-15 00:00:00', '2024-01-15 23:59:59', CURRENT_TIMESTAMP);
