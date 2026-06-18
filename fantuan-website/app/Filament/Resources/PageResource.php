<?php
namespace App\Filament\Resources;

use App\Filament\Resources\PageResource\Pages;
use App\Models\Page;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PageResource extends Resource
{
    protected static ?string $model = Page::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $navigationLabel = '页面内容';

    protected static ?string $modelLabel = '页面';

    protected static ?string $pluralModelLabel = '页面内容';

    protected static ?string $navigationGroup = '内容管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('基本信息')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->label('标题')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('slug')
                            ->label('URL 标识')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->helperText('例如: about, features, contact'),
                        Forms\Components\Toggle::make('published')
                            ->label('发布')
                            ->default(false),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('内容')
                    ->schema([
                        Forms\Components\RichEditor::make('content')
                            ->label('页面内容')
                            ->toolbarButtons([
                                'bold', 'italic', 'underline', 'strike',
                                'link', 'heading', 'blockquote',
                                'bulletList', 'orderedList',
                                'codeBlock', 'table',
                            ]),
                    ]),

                Forms\Components\Section::make('元数据')
                    ->schema([
                        Forms\Components\KeyValue::make('meta')
                            ->label('自定义字段'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('标题')
                    ->searchable(),
                Tables\Columns\TextColumn::make('slug')
                    ->label('URL 标识')
                    ->searchable()
                    ->badge()
                    ->color('gray'),
                Tables\Columns\IconColumn::make('published')
                    ->label('状态')
                    ->boolean(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('最后更新')
                    ->dateTime('Y-m-d H:i')
                    ->sortable(),
            ])
            ->defaultSort('updated_at', 'desc')
            ->filters([
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

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPages::route('/'),
            'create' => Pages\CreatePage::route('/create'),
            'edit' => Pages\EditPage::route('/{record}/edit'),
        ];
    }
}
