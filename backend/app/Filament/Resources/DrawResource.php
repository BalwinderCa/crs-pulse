<?php

namespace App\Filament\Resources;

use App\Filament\Resources\DrawResource\Pages;
use App\Models\Draw;
use App\Services\DrawService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class DrawResource extends Resource
{
    protected static ?string $model = Draw::class;
    protected static ?string $navigationIcon = 'heroicon-o-document-text';
    protected static ?string $navigationGroup = 'Express Entry';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('Draw Details')->schema([
                Forms\Components\TextInput::make('draw_number')
                    ->required()
                    ->numeric()
                    ->unique(ignoreRecord: true)
                    ->label('Draw Number'),

                Forms\Components\DatePicker::make('date')
                    ->required()
                    ->maxDate(now())
                    ->label('Draw Date'),

                Forms\Components\Select::make('category')
                    ->required()
                    ->options([
                        'CEC'        => 'Canadian Experience Class',
                        'General'    => 'No Category (General)',
                        'Healthcare' => 'Healthcare Occupations',
                        'STEM'       => 'STEM Occupations',
                        'Trades'     => 'Trade Occupations',
                        'French'     => 'French Language Proficiency',
                    ]),

                Forms\Components\TextInput::make('cutoff_score')
                    ->required()
                    ->numeric()
                    ->minValue(0)
                    ->maxValue(1200)
                    ->label('Cutoff Score'),

                Forms\Components\TextInput::make('invitations_issued')
                    ->required()
                    ->numeric()
                    ->minValue(0)
                    ->label('Invitations Issued'),

                Forms\Components\TextInput::make('tie_breaking_rule')
                    ->nullable()
                    ->label('Tie Breaking Rule'),

                Forms\Components\Textarea::make('notes')
                    ->nullable()
                    ->rows(3),

                Forms\Components\Toggle::make('is_published')
                    ->label('Published')
                    ->helperText('Publishing sends push notifications to users.'),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('draw_number')->sortable()->label('#'),
                Tables\Columns\TextColumn::make('date')->date('M d, Y')->sortable(),
                Tables\Columns\TextColumn::make('category')->badge(),
                Tables\Columns\TextColumn::make('cutoff_score')->sortable()->label('Cutoff'),
                Tables\Columns\TextColumn::make('invitations_issued')->numeric()->sortable()->label('Invitations'),
                Tables\Columns\IconColumn::make('is_published')->boolean()->label('Published'),
                Tables\Columns\TextColumn::make('published_at')->dateTime('M d, Y H:i')->sortable()->label('Published At'),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('category')->options([
                    'CEC'        => 'CEC',
                    'General'    => 'General',
                    'Healthcare' => 'Healthcare',
                    'STEM'       => 'STEM',
                    'Trades'     => 'Trades',
                    'French'     => 'French',
                ]),
                Tables\Filters\TernaryFilter::make('is_published')->label('Published'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('publish')
                    ->label('Publish & Notify')
                    ->icon('heroicon-o-bell')
                    ->color('success')
                    ->visible(fn (Draw $record) => ! $record->is_published)
                    ->requiresConfirmation()
                    ->action(function (Draw $record) {
                        app(DrawService::class)->publish($record);
                        Notification::make()
                            ->title('Draw published and notifications dispatched.')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('date', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListDraws::route('/'),
            'create' => Pages\CreateDraw::route('/create'),
            'edit'   => Pages\EditDraw::route('/{record}/edit'),
        ];
    }
}
