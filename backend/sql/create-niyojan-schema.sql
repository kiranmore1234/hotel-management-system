-- SQL Server schema for Niyojan, generated from the application's EF Core model.
-- Run against an empty Niyojan database; this script does not delete or alter existing data.
CREATE TABLE [Categories] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [KitchenSection] nvarchar(50) NULL,
    [SortOrder] int NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Floors] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [SortOrder] int NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_Floors] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Settings] (
    [Id] int NOT NULL IDENTITY,
    [RestaurantName] nvarchar(150) NOT NULL,
    [Address] nvarchar(max) NULL,
    [Phone] nvarchar(max) NULL,
    [Gstin] nvarchar(max) NULL,
    [LogoUrl] nvarchar(max) NULL,
    [DefaultCgstPercent] decimal(5,2) NOT NULL,
    [DefaultSgstPercent] decimal(5,2) NOT NULL,
    [ServiceChargePercent] decimal(5,2) NOT NULL,
    [Currency] nvarchar(max) NOT NULL,
    [BillPrefix] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Settings] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Users] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [Username] nvarchar(50) NOT NULL,
    [Phone] nvarchar(max) NULL,
    [JobTitle] nvarchar(50) NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [PinHash] nvarchar(max) NULL,
    [Role] int NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [MenuItems] (
    [Id] int NOT NULL IDENTITY,
    [CategoryId] int NOT NULL,
    [Name] nvarchar(150) NOT NULL,
    [Description] nvarchar(max) NULL,
    [Price] decimal(18,2) NOT NULL,
    [HalfPrice] decimal(18,2) NOT NULL,
    [TaxPercent] decimal(5,2) NOT NULL,
    [VegType] int NOT NULL,
    [ImageUrl] nvarchar(max) NULL,
    [IsAvailable] bit NOT NULL,
    [HasHalfFull] bit NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_MenuItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MenuItems_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [Tables] (
    [Id] int NOT NULL IDENTITY,
    [FloorId] int NOT NULL,
    [TableNo] nvarchar(20) NOT NULL,
    [Capacity] int NOT NULL,
    [Status] int NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_Tables] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Tables_Floors_FloorId] FOREIGN KEY ([FloorId]) REFERENCES [Floors] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [AuditLogs] (
    [Id] int NOT NULL IDENTITY,
    [UserId] int NULL,
    [Action] nvarchar(max) NOT NULL,
    [Details] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AuditLogs_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [StaffAttendance] (
    [Id] int NOT NULL IDENTITY,
    [UserId] int NOT NULL,
    [StaffName] nvarchar(100) NULL,
    [WorkDate] datetime2 NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [CheckIn] datetime2 NULL,
    [CheckOut] datetime2 NULL,
    [MarkedAt] datetime2 NULL,
    [Notes] nvarchar(250) NULL,
    [RecordedByUserId] int NOT NULL,
    CONSTRAINT [PK_StaffAttendance] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_StaffAttendance_Users_RecordedByUserId] FOREIGN KEY ([RecordedByUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_StaffAttendance_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO


CREATE TABLE [Orders] (
    [Id] int NOT NULL IDENTITY,
    [OrderNumber] nvarchar(30) NOT NULL,
    [TableId] int NOT NULL,
    [CaptainId] int NOT NULL,
    [Status] int NOT NULL,
    [Guests] int NOT NULL,
    [CustomerName] nvarchar(max) NULL,
    [CustomerPhone] nvarchar(max) NULL,
    [KotCounter] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [ClosedAt] datetime2 NULL,
    CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Orders_Tables_TableId] FOREIGN KEY ([TableId]) REFERENCES [Tables] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Orders_Users_CaptainId] FOREIGN KEY ([CaptainId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [Bills] (
    [Id] int NOT NULL IDENTITY,
    [OrderId] int NOT NULL,
    [BillNumber] nvarchar(30) NOT NULL,
    [Subtotal] decimal(18,2) NOT NULL,
    [DiscountAmount] decimal(18,2) NOT NULL,
    [DiscountPercent] decimal(5,2) NOT NULL,
    [ServiceCharge] decimal(18,2) NOT NULL,
    [Cgst] decimal(18,2) NOT NULL,
    [Sgst] decimal(18,2) NOT NULL,
    [RoundOff] decimal(18,2) NOT NULL,
    [Total] decimal(18,2) NOT NULL,
    [PaymentMode] int NULL,
    [PaidAmount] decimal(18,2) NOT NULL,
    [PrintedByUserId] int NULL,
    [PrintCount] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [PaidAt] datetime2 NULL,
    CONSTRAINT [PK_Bills] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Bills_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Bills_Users_PrintedByUserId] FOREIGN KEY ([PrintedByUserId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [Kots] (
    [Id] int NOT NULL IDENTITY,
    [OrderId] int NOT NULL,
    [KotNo] int NOT NULL,
    [Section] nvarchar(max) NULL,
    [PrintedAt] datetime2 NOT NULL,
    [IsPrinted] bit NOT NULL,
    CONSTRAINT [PK_Kots] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Kots_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [OrderItems] (
    [Id] int NOT NULL IDENTITY,
    [OrderId] int NOT NULL,
    [MenuItemId] int NOT NULL,
    [ItemName] nvarchar(150) NOT NULL,
    [UnitPrice] decimal(18,2) NOT NULL,
    [Quantity] int NOT NULL,
    [Note] nvarchar(250) NULL,
    [IsHalf] bit NOT NULL,
    [Status] int NOT NULL,
    [KotNo] int NOT NULL,
    [TakenByUserId] int NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_OrderItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OrderItems_MenuItems_MenuItemId] FOREIGN KEY ([MenuItemId]) REFERENCES [MenuItems] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_OrderItems_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_OrderItems_Users_TakenByUserId] FOREIGN KEY ([TakenByUserId]) REFERENCES [Users] ([Id])
);
GO


CREATE INDEX [IX_AuditLogs_UserId] ON [AuditLogs] ([UserId]);
GO


CREATE UNIQUE INDEX [IX_Bills_BillNumber] ON [Bills] ([BillNumber]);
GO


CREATE UNIQUE INDEX [IX_Bills_OrderId] ON [Bills] ([OrderId]);
GO


CREATE INDEX [IX_Bills_PrintedByUserId] ON [Bills] ([PrintedByUserId]);
GO


CREATE INDEX [IX_Kots_OrderId] ON [Kots] ([OrderId]);
GO


CREATE INDEX [IX_MenuItems_CategoryId] ON [MenuItems] ([CategoryId]);
GO


CREATE INDEX [IX_OrderItems_MenuItemId] ON [OrderItems] ([MenuItemId]);
GO


CREATE INDEX [IX_OrderItems_OrderId] ON [OrderItems] ([OrderId]);
GO


CREATE INDEX [IX_OrderItems_TakenByUserId] ON [OrderItems] ([TakenByUserId]);
GO


CREATE INDEX [IX_Orders_CaptainId] ON [Orders] ([CaptainId]);
GO


CREATE UNIQUE INDEX [IX_Orders_OrderNumber] ON [Orders] ([OrderNumber]);
GO


CREATE INDEX [IX_Orders_TableId] ON [Orders] ([TableId]);
GO


CREATE INDEX [IX_StaffAttendance_RecordedByUserId] ON [StaffAttendance] ([RecordedByUserId]);
GO


CREATE UNIQUE INDEX [IX_StaffAttendance_UserId_WorkDate] ON [StaffAttendance] ([UserId], [WorkDate]);
GO


CREATE UNIQUE INDEX [IX_Tables_FloorId_TableNo] ON [Tables] ([FloorId], [TableNo]);
GO


CREATE UNIQUE INDEX [IX_Users_Username] ON [Users] ([Username]);
GO
