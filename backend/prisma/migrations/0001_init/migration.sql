-- =============================================================================
-- MIGRATION 0001_init
-- Bagian 1 (PRELUDE, ditulis manual): sequence & fungsi pembuat ID otomatis.
-- Harus berada SEBELUM DDL hasil Prisma karena kolom id memakai DEFAULT next_xxx_id().
--
-- Format ID: <PREFIX>-<nomor 4 digit+> , mis. CAM-0001, CAM-0002, ... CAM-10000.
-- Nomor berasal dari sequence PostgreSQL: unik, atomik, aman untuk request paralel.
-- Nomor TIDAK dipakai ulang dan boleh ada celah (mis. insert yang di-rollback).
-- Fungsi dibuat satu per entitas (tanpa argumen) agar ekspresi DEFAULT stabil
-- dan tidak menimbulkan drift pada `prisma migrate dev`.
-- =============================================================================

CREATE SEQUENCE "user_id_seq"           AS BIGINT START 1;
CREATE SEQUENCE "site_id_seq"           AS BIGINT START 1;
CREATE SEQUENCE "zone_id_seq"           AS BIGINT START 1;
CREATE SEQUENCE "camera_id_seq"         AS BIGINT START 1;
CREATE SEQUENCE "audio_device_id_seq"   AS BIGINT START 1;
CREATE SEQUENCE "audio_group_id_seq"    AS BIGINT START 1;
CREATE SEQUENCE "audio_schedule_id_seq" AS BIGINT START 1;

CREATE FUNCTION next_user_id() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT 'USR-' || lpad(nextval('user_id_seq')::text, 4, '0') $$;

CREATE FUNCTION next_site_id() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT 'SIT-' || lpad(nextval('site_id_seq')::text, 4, '0') $$;

CREATE FUNCTION next_zone_id() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT 'ZON-' || lpad(nextval('zone_id_seq')::text, 4, '0') $$;

CREATE FUNCTION next_camera_id() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT 'CAM-' || lpad(nextval('camera_id_seq')::text, 4, '0') $$;

CREATE FUNCTION next_audio_device_id() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT 'AUD-' || lpad(nextval('audio_device_id_seq')::text, 4, '0') $$;

CREATE FUNCTION next_audio_group_id() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT 'GRP-' || lpad(nextval('audio_group_id_seq')::text, 4, '0') $$;

CREATE FUNCTION next_audio_schedule_id() RETURNS TEXT LANGUAGE sql VOLATILE AS
$$ SELECT 'SCH-' || lpad(nextval('audio_schedule_id_seq')::text, 4, '0') $$;

-- =============================================================================
-- Bagian 2: DDL hasil `prisma migrate diff` dari schema.prisma
-- =============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('UNKNOWN', 'ONLINE', 'OFFLINE', 'WARNING');

-- CreateEnum
CREATE TYPE "stream_status" AS ENUM ('NOT_CONFIGURED', 'UNKNOWN', 'AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "event_type" AS ENUM ('DEVICE_STATUS_CHANGE', 'STREAM_UNAVAILABLE', 'VIDEO_LOSS', 'MOTION_DETECTED', 'TAMPERING', 'AUDIO_FAILURE', 'SCHEDULE_FAILURE', 'SYSTEM', 'OTHER');

-- CreateEnum
CREATE TYPE "event_severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "execution_mode" AS ENUM ('SIMULATION', 'DEVICE');

-- CreateEnum
CREATE TYPE "audio_command_kind" AS ENUM ('PTT', 'TTS');

-- CreateEnum
CREATE TYPE "audio_command_source" AS ENUM ('MANUAL', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "audio_command_status" AS ENUM ('PENDING', 'ACTIVE', 'SUCCESS', 'PARTIAL', 'UNCONFIRMED', 'FAILED', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "audio_target_status" AS ENUM ('PENDING', 'SENDING', 'DELIVERED', 'UNCONFIRMED', 'FAILED', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "audio_target_type" AS ENUM ('DEVICE', 'ZONE', 'GROUP');

-- CreateEnum
CREATE TYPE "schedule_recurrence" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "misfire_policy" AS ENUM ('SKIP', 'RUN_ONCE');

-- CreateEnum
CREATE TYPE "schedule_execution_status" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'UNCONFIRMED', 'FAILED', 'SKIPPED', 'MISSED');

-- CreateEnum
CREATE TYPE "audit_result" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(20) NOT NULL DEFAULT next_user_id(),
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "full_name" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'OPERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_zone_access" (
    "user_id" VARCHAR(20) NOT NULL,
    "zone_id" VARCHAR(20) NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_zone_access_pkey" PRIMARY KEY ("user_id","zone_id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" VARCHAR(20) NOT NULL DEFAULT next_site_id(),
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "address" VARCHAR(255),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" VARCHAR(20) NOT NULL DEFAULT next_zone_id(),
    "site_id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" VARCHAR(20) NOT NULL DEFAULT next_camera_id(),
    "name" VARCHAR(120) NOT NULL,
    "site_id" VARCHAR(20) NOT NULL,
    "zone_id" VARCHAR(20),
    "description" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "manufacturer" VARCHAR(80),
    "model" VARCHAR(80),
    "host" VARCHAR(255),
    "port" INTEGER,
    "adapter_type" VARCHAR(30) NOT NULL DEFAULT 'mock',
    "adapter_config" JSONB,
    "stream_key" VARCHAR(120),
    "credential_cipher" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "status" "device_status" NOT NULL DEFAULT 'UNKNOWN',
    "stream_status" "stream_status" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "status_reason" VARCHAR(255),
    "status_changed_at" TIMESTAMPTZ(3),
    "last_checked_at" TIMESTAMPTZ(3),
    "last_seen_at" TIMESTAMPTZ(3),
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_devices" (
    "id" VARCHAR(20) NOT NULL DEFAULT next_audio_device_id(),
    "name" VARCHAR(120) NOT NULL,
    "site_id" VARCHAR(20) NOT NULL,
    "zone_id" VARCHAR(20),
    "description" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "manufacturer" VARCHAR(80),
    "model" VARCHAR(80),
    "host" VARCHAR(255),
    "port" INTEGER,
    "adapter_type" VARCHAR(30) NOT NULL DEFAULT 'mock',
    "adapter_config" JSONB,
    "credential_cipher" TEXT,
    "supports_ptt" BOOLEAN NOT NULL DEFAULT false,
    "supports_tts" BOOLEAN NOT NULL DEFAULT false,
    "supports_delivery_receipt" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "status" "device_status" NOT NULL DEFAULT 'UNKNOWN',
    "status_reason" VARCHAR(255),
    "status_changed_at" TIMESTAMPTZ(3),
    "last_checked_at" TIMESTAMPTZ(3),
    "last_seen_at" TIMESTAMPTZ(3),
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "audio_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_groups" (
    "id" VARCHAR(20) NOT NULL DEFAULT next_audio_group_id(),
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "audio_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_group_members" (
    "group_id" VARCHAR(20) NOT NULL,
    "audio_device_id" VARCHAR(20) NOT NULL,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_group_members_pkey" PRIMARY KEY ("group_id","audio_device_id")
);

-- CreateTable
CREATE TABLE "device_status_history" (
    "id" BIGSERIAL NOT NULL,
    "camera_id" VARCHAR(20),
    "audio_device_id" VARCHAR(20),
    "from_status" "device_status",
    "to_status" "device_status" NOT NULL,
    "reason" VARCHAR(255),
    "latency_ms" INTEGER,
    "detail" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" BIGSERIAL NOT NULL,
    "type" "event_type" NOT NULL,
    "severity" "event_severity" NOT NULL DEFAULT 'INFO',
    "status" "event_status" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT,
    "camera_id" VARCHAR(20),
    "audio_device_id" VARCHAR(20),
    "site_id" VARCHAR(20),
    "zone_id" VARCHAR(20),
    "status_history_id" BIGINT,
    "dedup_key" VARCHAR(120),
    "detail" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by_id" VARCHAR(20),
    "acknowledged_at" TIMESTAMPTZ(3),
    "resolved_by_id" VARCHAR(20),
    "resolved_at" TIMESTAMPTZ(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_schedules" (
    "id" VARCHAR(20) NOT NULL DEFAULT next_audio_schedule_id(),
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "tts_text" TEXT NOT NULL,
    "tts_language" VARCHAR(10) NOT NULL DEFAULT 'id-ID',
    "tts_voice" VARCHAR(60),
    "timezone" VARCHAR(64) NOT NULL,
    "recurrence" "schedule_recurrence" NOT NULL,
    "run_at" TIMESTAMPTZ(3),
    "time_of_day" TIME(0),
    "start_date" DATE,
    "end_date" DATE,
    "days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "day_of_month" INTEGER,
    "misfire_policy" "misfire_policy" NOT NULL DEFAULT 'SKIP',
    "misfire_grace_seconds" INTEGER NOT NULL DEFAULT 300,
    "max_retries" INTEGER NOT NULL DEFAULT 2,
    "retry_delay_seconds" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "next_run_at" TIMESTAMPTZ(3),
    "last_run_at" TIMESTAMPTZ(3),
    "created_by_id" VARCHAR(20) NOT NULL,
    "updated_by_id" VARCHAR(20),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "audio_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_schedule_targets" (
    "id" BIGSERIAL NOT NULL,
    "schedule_id" VARCHAR(20) NOT NULL,
    "target_type" "audio_target_type" NOT NULL,
    "device_id" VARCHAR(20),
    "zone_id" VARCHAR(20),
    "group_id" VARCHAR(20),

    CONSTRAINT "audio_schedule_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_schedule_executions" (
    "id" BIGSERIAL NOT NULL,
    "schedule_id" VARCHAR(20) NOT NULL,
    "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
    "status" "schedule_execution_status" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "worker_id" VARCHAR(80),
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_schedule_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_commands" (
    "id" BIGSERIAL NOT NULL,
    "kind" "audio_command_kind" NOT NULL,
    "source" "audio_command_source" NOT NULL DEFAULT 'MANUAL',
    "status" "audio_command_status" NOT NULL DEFAULT 'PENDING',
    "mode" "execution_mode" NOT NULL,
    "user_id" VARCHAR(20),
    "schedule_execution_id" BIGINT,
    "tts_text" TEXT,
    "tts_language" VARCHAR(10),
    "target_spec" JSONB NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(3),
    "ended_at" TIMESTAMPTZ(3),
    "error_code" VARCHAR(60),
    "error_message" TEXT,

    CONSTRAINT "audio_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_command_targets" (
    "id" BIGSERIAL NOT NULL,
    "command_id" BIGINT NOT NULL,
    "audio_device_id" VARCHAR(20) NOT NULL,
    "status" "audio_target_status" NOT NULL DEFAULT 'PENDING',
    "delivery_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "error_code" VARCHAR(60),
    "error_message" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_command_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_channel_leases" (
    "audio_device_id" VARCHAR(20) NOT NULL,
    "command_id" BIGINT NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "acquired_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeat_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "audio_channel_leases_pkey" PRIMARY KEY ("audio_device_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" VARCHAR(20),
    "actor_username" VARCHAR(50),
    "action" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(40),
    "entity_id" VARCHAR(40),
    "result" "audit_result" NOT NULL DEFAULT 'SUCCESS',
    "message" VARCHAR(500),
    "before" JSONB,
    "after" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "request_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(255),
    "updated_by_id" VARCHAR(20),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "user_zone_access_zone_id_idx" ON "user_zone_access"("zone_id");

-- CreateIndex
CREATE INDEX "sites_is_active_deleted_at_idx" ON "sites"("is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "zones_site_id_idx" ON "zones"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_id_site_id_key" ON "zones"("id", "site_id");

-- CreateIndex
CREATE INDEX "cameras_site_id_idx" ON "cameras"("site_id");

-- CreateIndex
CREATE INDEX "cameras_zone_id_idx" ON "cameras"("zone_id");

-- CreateIndex
CREATE INDEX "cameras_status_idx" ON "cameras"("status");

-- CreateIndex
CREATE INDEX "cameras_is_active_deleted_at_idx" ON "cameras"("is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "audio_devices_site_id_idx" ON "audio_devices"("site_id");

-- CreateIndex
CREATE INDEX "audio_devices_zone_id_idx" ON "audio_devices"("zone_id");

-- CreateIndex
CREATE INDEX "audio_devices_status_idx" ON "audio_devices"("status");

-- CreateIndex
CREATE INDEX "audio_devices_is_active_deleted_at_idx" ON "audio_devices"("is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "audio_group_members_audio_device_id_idx" ON "audio_group_members"("audio_device_id");

-- CreateIndex
CREATE INDEX "device_status_history_camera_id_occurred_at_idx" ON "device_status_history"("camera_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "device_status_history_audio_device_id_occurred_at_idx" ON "device_status_history"("audio_device_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "device_status_history_occurred_at_idx" ON "device_status_history"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_status_history_id_key" ON "events"("status_history_id");

-- CreateIndex
CREATE INDEX "events_occurred_at_idx" ON "events"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "events_status_severity_occurred_at_idx" ON "events"("status", "severity", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "events_camera_id_occurred_at_idx" ON "events"("camera_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "events_audio_device_id_occurred_at_idx" ON "events"("audio_device_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "events_site_id_idx" ON "events"("site_id");

-- CreateIndex
CREATE INDEX "events_zone_id_idx" ON "events"("zone_id");

-- CreateIndex
CREATE INDEX "events_dedup_key_idx" ON "events"("dedup_key");

-- CreateIndex
CREATE INDEX "audio_schedules_is_active_next_run_at_idx" ON "audio_schedules"("is_active", "next_run_at");

-- CreateIndex
CREATE INDEX "audio_schedule_targets_device_id_idx" ON "audio_schedule_targets"("device_id");

-- CreateIndex
CREATE INDEX "audio_schedule_targets_zone_id_idx" ON "audio_schedule_targets"("zone_id");

-- CreateIndex
CREATE INDEX "audio_schedule_targets_group_id_idx" ON "audio_schedule_targets"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_schedule_targets_schedule_id_device_id_key" ON "audio_schedule_targets"("schedule_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_schedule_targets_schedule_id_zone_id_key" ON "audio_schedule_targets"("schedule_id", "zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_schedule_targets_schedule_id_group_id_key" ON "audio_schedule_targets"("schedule_id", "group_id");

-- CreateIndex
CREATE INDEX "audio_schedule_executions_status_scheduled_for_idx" ON "audio_schedule_executions"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "audio_schedule_executions_schedule_id_scheduled_for_idx" ON "audio_schedule_executions"("schedule_id", "scheduled_for" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "audio_schedule_executions_schedule_id_scheduled_for_key" ON "audio_schedule_executions"("schedule_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "audio_commands_requested_at_idx" ON "audio_commands"("requested_at" DESC);

-- CreateIndex
CREATE INDEX "audio_commands_user_id_requested_at_idx" ON "audio_commands"("user_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "audio_commands_status_idx" ON "audio_commands"("status");

-- CreateIndex
CREATE INDEX "audio_commands_schedule_execution_id_idx" ON "audio_commands"("schedule_execution_id");

-- CreateIndex
CREATE INDEX "audio_command_targets_audio_device_id_created_at_idx" ON "audio_command_targets"("audio_device_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audio_command_targets_status_idx" ON "audio_command_targets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "audio_command_targets_command_id_audio_device_id_key" ON "audio_command_targets"("command_id", "audio_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_channel_leases_command_id_key" ON "audio_channel_leases"("command_id");

-- CreateIndex
CREATE INDEX "audio_channel_leases_expires_at_idx" ON "audio_channel_leases"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_zone_access" ADD CONSTRAINT "user_zone_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_zone_access" ADD CONSTRAINT "user_zone_access_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_zone_id_site_id_fkey" FOREIGN KEY ("zone_id", "site_id") REFERENCES "zones"("id", "site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_devices" ADD CONSTRAINT "audio_devices_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_devices" ADD CONSTRAINT "audio_devices_zone_id_site_id_fkey" FOREIGN KEY ("zone_id", "site_id") REFERENCES "zones"("id", "site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_group_members" ADD CONSTRAINT "audio_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "audio_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_group_members" ADD CONSTRAINT "audio_group_members_audio_device_id_fkey" FOREIGN KEY ("audio_device_id") REFERENCES "audio_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_status_history" ADD CONSTRAINT "device_status_history_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_status_history" ADD CONSTRAINT "device_status_history_audio_device_id_fkey" FOREIGN KEY ("audio_device_id") REFERENCES "audio_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_audio_device_id_fkey" FOREIGN KEY ("audio_device_id") REFERENCES "audio_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_status_history_id_fkey" FOREIGN KEY ("status_history_id") REFERENCES "device_status_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_schedule_targets" ADD CONSTRAINT "audio_schedule_targets_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "audio_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_schedule_targets" ADD CONSTRAINT "audio_schedule_targets_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "audio_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_schedule_targets" ADD CONSTRAINT "audio_schedule_targets_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_schedule_targets" ADD CONSTRAINT "audio_schedule_targets_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "audio_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_schedule_executions" ADD CONSTRAINT "audio_schedule_executions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "audio_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_commands" ADD CONSTRAINT "audio_commands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_commands" ADD CONSTRAINT "audio_commands_schedule_execution_id_fkey" FOREIGN KEY ("schedule_execution_id") REFERENCES "audio_schedule_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_command_targets" ADD CONSTRAINT "audio_command_targets_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "audio_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_command_targets" ADD CONSTRAINT "audio_command_targets_audio_device_id_fkey" FOREIGN KEY ("audio_device_id") REFERENCES "audio_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_channel_leases" ADD CONSTRAINT "audio_channel_leases_audio_device_id_fkey" FOREIGN KEY ("audio_device_id") REFERENCES "audio_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_channel_leases" ADD CONSTRAINT "audio_channel_leases_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "audio_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_channel_leases" ADD CONSTRAINT "audio_channel_leases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =============================================================================
-- Bagian 3 (POSTLUDE, ditulis manual): integritas yang tidak dapat diekspresikan Prisma.
-- Prisma mengabaikan CHECK, function, dan trigger saat membandingkan schema (tidak ada drift).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 Format ID master data: menolak ID manual yang tidak sesuai pola
-- -----------------------------------------------------------------------------
ALTER TABLE "users"          ADD CONSTRAINT "users_id_format_chk"          CHECK ("id" ~ '^USR-[0-9]{4,}$');
ALTER TABLE "sites"          ADD CONSTRAINT "sites_id_format_chk"          CHECK ("id" ~ '^SIT-[0-9]{4,}$');
ALTER TABLE "zones"          ADD CONSTRAINT "zones_id_format_chk"          CHECK ("id" ~ '^ZON-[0-9]{4,}$');
ALTER TABLE "cameras"        ADD CONSTRAINT "cameras_id_format_chk"        CHECK ("id" ~ '^CAM-[0-9]{4,}$');
ALTER TABLE "audio_devices"  ADD CONSTRAINT "audio_devices_id_format_chk"  CHECK ("id" ~ '^AUD-[0-9]{4,}$');
ALTER TABLE "audio_groups"   ADD CONSTRAINT "audio_groups_id_format_chk"   CHECK ("id" ~ '^GRP-[0-9]{4,}$');
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_id_format_chk" CHECK ("id" ~ '^SCH-[0-9]{4,}$');

-- -----------------------------------------------------------------------------
-- 3.2 Fungsi pengaman: ID immutable, tabel append-only, penghapusan terlindungi
-- -----------------------------------------------------------------------------

-- ID / primary key tidak boleh diubah oleh siapa pun (aplikasi, SQL manual, maupun seed).
CREATE FUNCTION prevent_id_change() RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id" THEN
    RAISE EXCEPTION 'Kolom id pada tabel % bersifat immutable (otomatis oleh sistem)', TG_TABLE_NAME
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION prevent_key_change() RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  IF NEW."key" IS DISTINCT FROM OLD."key" THEN
    RAISE EXCEPTION 'Kolom key pada tabel % bersifat immutable', TG_TABLE_NAME
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Izin purge retensi: HANYA job retensi yang boleh menjalankan
--   BEGIN; SET LOCAL app.allow_purge = 'on'; DELETE ...; COMMIT;
-- Pengguna/API biasa tidak pernah mengaktifkan setting ini.
CREATE FUNCTION app_purge_allowed() RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('app.allow_purge', true), '') = 'on' $$;

CREATE FUNCTION block_update() RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  RAISE EXCEPTION 'Tabel % bersifat append-only: UPDATE tidak diizinkan', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE FUNCTION block_delete_unless_purge() RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  IF NOT app_purge_allowed() THEN
    RAISE EXCEPTION 'Penghapusan fisik pada tabel % tidak diizinkan (gunakan arsip/soft delete atau job retensi)', TG_TABLE_NAME
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3.3 Pasang trigger
-- -----------------------------------------------------------------------------

-- (a) ID immutable pada semua tabel ber-kolom id
CREATE TRIGGER "users_id_immutable"                    BEFORE UPDATE ON "users"                    FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "sites_id_immutable"                    BEFORE UPDATE ON "sites"                    FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "zones_id_immutable"                    BEFORE UPDATE ON "zones"                    FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "cameras_id_immutable"                  BEFORE UPDATE ON "cameras"                  FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audio_devices_id_immutable"            BEFORE UPDATE ON "audio_devices"            FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audio_groups_id_immutable"             BEFORE UPDATE ON "audio_groups"             FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audio_schedules_id_immutable"          BEFORE UPDATE ON "audio_schedules"          FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "sessions_id_immutable"                 BEFORE UPDATE ON "sessions"                 FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "events_id_immutable"                   BEFORE UPDATE ON "events"                   FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audio_schedule_targets_id_immutable"   BEFORE UPDATE ON "audio_schedule_targets"  FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audio_schedule_executions_id_immutable" BEFORE UPDATE ON "audio_schedule_executions" FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audio_commands_id_immutable"           BEFORE UPDATE ON "audio_commands"           FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audio_command_targets_id_immutable"    BEFORE UPDATE ON "audio_command_targets"    FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "device_status_history_id_immutable"    BEFORE UPDATE ON "device_status_history"    FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "audit_logs_id_immutable"               BEFORE UPDATE ON "audit_logs"               FOR EACH ROW EXECUTE FUNCTION prevent_id_change();
CREATE TRIGGER "system_settings_key_immutable"         BEFORE UPDATE ON "system_settings"          FOR EACH ROW EXECUTE FUNCTION prevent_key_change();

-- (b) APPEND-ONLY: histori status & audit log (UPDATE selalu ditolak; DELETE hanya via purge retensi)
CREATE TRIGGER "device_status_history_no_update" BEFORE UPDATE ON "device_status_history" FOR EACH ROW EXECUTE FUNCTION block_update();
CREATE TRIGGER "device_status_history_no_delete" BEFORE DELETE ON "device_status_history" FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "audit_logs_no_update"            BEFORE UPDATE ON "audit_logs"            FOR EACH ROW EXECUTE FUNCTION block_update();
CREATE TRIGGER "audit_logs_no_delete"            BEFORE DELETE ON "audit_logs"            FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();

-- (c) DELETE-PROTECTED: data siklus hidup (boleh di-update oleh sistem) & data master (gunakan soft delete)
CREATE TRIGGER "events_no_delete"                      BEFORE DELETE ON "events"                      FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "audio_commands_no_delete"              BEFORE DELETE ON "audio_commands"              FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "audio_command_targets_no_delete"       BEFORE DELETE ON "audio_command_targets"       FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "audio_schedule_executions_no_delete"   BEFORE DELETE ON "audio_schedule_executions"  FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "users_no_delete"                       BEFORE DELETE ON "users"                       FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "sites_no_delete"                       BEFORE DELETE ON "sites"                       FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "zones_no_delete"                       BEFORE DELETE ON "zones"                       FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "cameras_no_delete"                     BEFORE DELETE ON "cameras"                     FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "audio_devices_no_delete"               BEFORE DELETE ON "audio_devices"               FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "audio_groups_no_delete"                BEFORE DELETE ON "audio_groups"                FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();
CREATE TRIGGER "audio_schedules_no_delete"             BEFORE DELETE ON "audio_schedules"             FOR EACH ROW EXECUTE FUNCTION block_delete_unless_purge();

-- -----------------------------------------------------------------------------
-- 3.4 CHECK constraint (aturan bisnis & integritas data)
-- -----------------------------------------------------------------------------

-- Pengguna
ALTER TABLE "users" ADD CONSTRAINT "users_username_lowercase_chk" CHECK ("username" = lower("username") AND char_length("username") >= 3);
ALTER TABLE "users" ADD CONSTRAINT "users_failed_login_count_chk"  CHECK ("failed_login_count" >= 0);
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_expiry_chk"        CHECK ("expires_at" > "created_at");

-- Koordinat: rentang valid & lat/lng harus terisi bersamaan
ALTER TABLE "sites" ADD CONSTRAINT "sites_coordinates_chk" CHECK (
  ("latitude" IS NULL) = ("longitude" IS NULL)
  AND ("latitude"  IS NULL OR "latitude"  BETWEEN -90  AND 90)
  AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180));
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_coordinates_chk" CHECK (
  ("latitude" IS NULL) = ("longitude" IS NULL)
  AND ("latitude"  IS NULL OR "latitude"  BETWEEN -90  AND 90)
  AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180));
ALTER TABLE "audio_devices" ADD CONSTRAINT "audio_devices_coordinates_chk" CHECK (
  ("latitude" IS NULL) = ("longitude" IS NULL)
  AND ("latitude"  IS NULL OR "latitude"  BETWEEN -90  AND 90)
  AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180));

-- Perangkat
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_port_chk"     CHECK ("port" IS NULL OR "port" BETWEEN 1 AND 65535);
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_failures_chk" CHECK ("consecutive_failures" >= 0);
ALTER TABLE "audio_devices" ADD CONSTRAINT "audio_devices_port_chk"     CHECK ("port" IS NULL OR "port" BETWEEN 1 AND 65535);
ALTER TABLE "audio_devices" ADD CONSTRAINT "audio_devices_failures_chk" CHECK ("consecutive_failures" >= 0);

-- Histori status: tepat SATU perangkat (kamera XOR perangkat audio)
ALTER TABLE "device_status_history" ADD CONSTRAINT "device_status_history_one_device_chk"
  CHECK (num_nonnulls("camera_id", "audio_device_id") = 1);
ALTER TABLE "device_status_history" ADD CONSTRAINT "device_status_history_latency_chk"
  CHECK ("latency_ms" IS NULL OR "latency_ms" >= 0);

-- Event: maksimal satu perangkat; konsistensi siklus hidup alarm
ALTER TABLE "events" ADD CONSTRAINT "events_one_device_chk" CHECK (num_nonnulls("camera_id", "audio_device_id") <= 1);
ALTER TABLE "events" ADD CONSTRAINT "events_lifecycle_chk" CHECK (
  ("status" <> 'ACKNOWLEDGED' OR "acknowledged_at" IS NOT NULL)
  AND ("status" <> 'RESOLVED' OR "resolved_at" IS NOT NULL));

-- Jadwal audio: kombinasi kolom harus sesuai tipe pengulangan
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_recurrence_chk" CHECK (
  "days_of_week" IS NOT NULL AND (
    ("recurrence" = 'ONCE'    AND "run_at" IS NOT NULL AND "time_of_day" IS NULL AND cardinality("days_of_week") = 0 AND "day_of_month" IS NULL)
 OR ("recurrence" = 'DAILY'   AND "run_at" IS NULL AND "time_of_day" IS NOT NULL AND "start_date" IS NOT NULL AND cardinality("days_of_week") = 0 AND "day_of_month" IS NULL)
 OR ("recurrence" = 'WEEKLY'  AND "run_at" IS NULL AND "time_of_day" IS NOT NULL AND "start_date" IS NOT NULL AND cardinality("days_of_week") > 0 AND "day_of_month" IS NULL)
 OR ("recurrence" = 'MONTHLY' AND "run_at" IS NULL AND "time_of_day" IS NOT NULL AND "start_date" IS NOT NULL AND cardinality("days_of_week") = 0 AND "day_of_month" IS NOT NULL)));
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_days_chk"
  CHECK ("days_of_week" <@ ARRAY[1,2,3,4,5,6,7]);
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_day_of_month_chk"
  CHECK ("day_of_month" IS NULL OR "day_of_month" BETWEEN 1 AND 31);
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_date_range_chk"
  CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date");
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_policy_chk"
  CHECK ("misfire_grace_seconds" >= 0 AND "max_retries" BETWEEN 0 AND 10 AND "retry_delay_seconds" >= 0);
ALTER TABLE "audio_schedules" ADD CONSTRAINT "audio_schedules_tts_text_chk"
  CHECK (char_length(btrim("tts_text")) BETWEEN 1 AND 1000);

-- Target jadwal: tepat satu kolom target terisi dan cocok dengan target_type
ALTER TABLE "audio_schedule_targets" ADD CONSTRAINT "audio_schedule_targets_type_chk" CHECK (
     ("target_type" = 'DEVICE' AND "device_id" IS NOT NULL AND "zone_id" IS NULL     AND "group_id" IS NULL)
  OR ("target_type" = 'ZONE'   AND "zone_id"   IS NOT NULL AND "device_id" IS NULL   AND "group_id" IS NULL)
  OR ("target_type" = 'GROUP'  AND "group_id"  IS NOT NULL AND "device_id" IS NULL   AND "zone_id" IS NULL));

-- Perintah audio: sumber, jenis, dan konten harus konsisten
ALTER TABLE "audio_commands" ADD CONSTRAINT "audio_commands_source_chk" CHECK (
     ("source" = 'MANUAL'   AND "user_id" IS NOT NULL AND "schedule_execution_id" IS NULL)
  OR ("source" = 'SCHEDULE' AND "schedule_execution_id" IS NOT NULL AND "kind" = 'TTS'));
ALTER TABLE "audio_commands" ADD CONSTRAINT "audio_commands_kind_chk"
  CHECK (("kind" = 'TTS') = ("tts_text" IS NOT NULL));
ALTER TABLE "audio_commands" ADD CONSTRAINT "audio_commands_time_chk"
  CHECK ("ended_at" IS NULL OR "started_at" IS NULL OR "ended_at" >= "started_at");
ALTER TABLE "audio_command_targets" ADD CONSTRAINT "audio_command_targets_attempts_chk" CHECK ("attempts" >= 0);
-- Kejujuran status: DELIVERED hanya sah jika ada konfirmasi pengiriman
ALTER TABLE "audio_command_targets" ADD CONSTRAINT "audio_command_targets_delivered_chk"
  CHECK ("status" <> 'DELIVERED' OR "delivery_confirmed" = true);

-- Lease PTT
ALTER TABLE "audio_channel_leases" ADD CONSTRAINT "audio_channel_leases_expiry_chk" CHECK ("expires_at" > "acquired_at");
