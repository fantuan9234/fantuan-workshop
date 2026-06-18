<?php
namespace App\Filament\Resources;

use App\Filament\Resources\ReleaseResource\Pages;
use App\Models\Release;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ReleaseResource extends Resource
{
    protected static ?string $model = Release::class;

    protected static ?string $navigationIcon = 'heroicon-o-arrow-down-tray';

    protected static ?string $navigationLabel = '版本管理';

    protected static ?string $modelLabel = '版本';

    protected static ?string $pluralModelLabel = '版本管理';

    protected static ?string $navigationGroup = '内容管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('版本信息')
                    ->schema([
                        Forms\Components\TextInput::make('version')
                            ->label('版本号')
                            ->required()
                            ->placeholder('0.1.9')
                            ->maxLength(20),
                        Forms\Components\TextInput::make('title')
                            ->label('标题')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\Select::make('platform')
                            ->label('平台')
                            ->options([
                                'windows' => 'Windows',
                                'macos' => 'macOS',
                                'linux' => 'Linux',
                            ])
                            ->default('windows')
                            ->required(),
                        Forms\Components\TextInput::make('file_size')
                            ->label('文件大小')
                            ->placeholder('50MB'),
                        Forms\Components\DateTimePicker::make('released_at')
                            ->label('发布日期')
                            ->default(now()),
                        Forms\Components\Toggle::make('published')
                            ->label('发布'),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('下载信息')
                    ->schema([
                        Forms\Components\TextInput::make('download_url')
                            ->label('下载地址')
                            ->required()
                            ->url()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('sha256')
                            ->label('SHA256 校验')
                            ->maxLength(255),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('描述与更新日志')
                    ->schema([
                        Forms\Components\Textarea::make('description')
                            ->label('简要描述')
                            ->rows(3),
                        Forms\Components\RichEditor::make('changelog')
                            ->label('更新日志'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('version')
                    ->label('版本号')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('title')
                    ->label('标题')
                    ->searchable(),
                Tables\Columns\TextColumn::make('platform')
                    ->label('平台')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'windows' => 'info',
                        'macos' => 'success',
                        'linux' => 'warning',
                    }),
                Tables\Columns\IconColumn::make('published')
                    ->label('状态')
                    ->boolean(),
                Tables\Columns\TextColumn::make('download_logs_count')
                    ->label('下载次数')
                    ->counts('downloadLogs')
                    ->sortable(),
                Tables\Columns\TextColumn::make('released_at')
                    ->label('发布日期')
                    ->dateTime('Y-m-d')
                    ->sortable(),
            ])
            ->defaultSort('released_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('platform')
                    ->label('平台')
                    ->options([
                        'windows' => 'Windows',
                        'macos' => 'macOS',
                        'linux' => 'Linux',
                    ]),
                Tables\Filters\TernaryFilter::make('published')
                    ->label('发布状态'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReleases::route('/'),
            'create' => Pages\CreateRelease::route('/create'),
            'edit' => Pages\EditRelease::route('/{record}/edit'),
        ];
    }
}
