<?php
namespace App\Filament\Resources;

use App\Filament\Resources\MessageResource\Pages;
use App\Models\Message;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MessageResource extends Resource
{
    protected static ?string $model = Message::class;

    protected static ?string $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static ?string $navigationLabel = '用户消息';

    protected static ?string $modelLabel = '消息';

    protected static ?string $pluralModelLabel = '用户消息';

    protected static ?string $navigationGroup = '内容管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('消息详情')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('姓名')
                            ->disabled(),
                        Forms\Components\TextInput::make('email')
                            ->label('邮箱')
                            ->disabled(),
                        Forms\Components\TextInput::make('subject')
                            ->label('主题')
                            ->disabled(),
                        Forms\Components\Textarea::make('content')
                            ->label('内容')
                            ->disabled()
                            ->rows(5),
                        Forms\Components\DateTimePicker::make('read_at')
                            ->label('阅读时间'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('姓名')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email')
                    ->label('邮箱')
                    ->searchable(),
                Tables\Columns\TextColumn::make('subject')
                    ->label('主题')
                    ->limit(30)
                    ->searchable(),
                Tables\Columns\IconColumn::make('read_at')
                    ->label('已读')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-envelope')
                    ->trueColor('success')
                    ->falseColor('warning'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('提交时间')
                    ->dateTime('Y-m-d H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\TernaryFilter::make('read_at')
                    ->label('状态')
                    ->nullable()
                    ->placeholder('全部消息')
                    ->trueLabel('已读')
                    ->falseLabel('未读'),
            ])
            ->actions([
                Tables\Actions\EditAction::make()->label('查看'),
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
            'index' => Pages\ListMessages::route('/'),
            'edit' => Pages\EditMessage::route('/{record}/edit'),
        ];
    }
}