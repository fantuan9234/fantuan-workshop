<?php
namespace App\Filament\Resources;

use App\Filament\Resources\PostResource\Pages;
use App\Models\Post;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationIcon = 'heroicon-o-megaphone';

    protected static ?string $navigationLabel = '公告管理';

    protected static ?string $modelLabel = '公告';

    protected static ?string $pluralModelLabel = '公告管理';

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
                            ->live(onBlur: true)
                            ->afterStateUpdated(fn ($state, callable $set) => $set('slug', Str::slug($state))),
                        Forms\Components\TextInput::make('slug')
                            ->label('URL 标识')
                            ->required()
                            ->unique(ignoreRecord: true),
                        Forms\Components\Textarea::make('excerpt')
                            ->label('摘要')
                            ->rows(3),
                        Forms\Components\TagsInput::make('tags')
                            ->label('标签')
                            ->placeholder('输入标签后回车'),
                        Forms\Components\DateTimePicker::make('published_at')
                            ->label('发布时间')
                            ->default(now()),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('封面图片')
                    ->schema([
                        Forms\Components\FileUpload::make('cover_image')
                            ->label('封面图')
                            ->image()
                            ->directory('blog/covers')
                            ->maxSize(2048)
                            ->imageEditor(),
                    ]),

                Forms\Components\Section::make('正文')
                    ->schema([
                        Forms\Components\RichEditor::make('content')
                            ->label('内容')
                            ->required()
                            ->toolbarButtons([
                                'bold', 'italic', 'underline', 'strike',
                                'link', 'heading', 'blockquote',
                                'bulletList', 'orderedList',
                                'codeBlock', 'table', 'image',
                            ]),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('标题')
                    ->searchable()
                    ->limit(40)
                    ->sortable(),
                Tables\Columns\TextColumn::make('tags')
                    ->label('标签')
                    ->badge()
                    ->separator(','),
                Tables\Columns\TextColumn::make('published_at')
                    ->label('发布时间')
                    ->dateTime('Y-m-d H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('创建时间')
                    ->dateTime('Y-m-d')
                    ->sortable(),
            ])
            ->defaultSort('published_at', 'desc')
            ->filters([
                Tables\Filters\Filter::make('published_at')
                    ->label('已发布')
                    ->query(fn ($query) => $query->whereNotNull('published_at')),
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
            'index' => Pages\ListPosts::route('/'),
            'create' => Pages\CreatePost::route('/create'),
            'edit' => Pages\EditPost::route('/{record}/edit'),
        ];
    }
}